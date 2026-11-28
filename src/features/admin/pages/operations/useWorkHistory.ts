import { useEffect, useRef, useState } from 'react';
import { workHistory, workHistoryDrones, type HistoryWork } from '../../api/adminHistoryApi';
import { invalidateAdminReads } from '../../api/adminHttp';
import { adminErrorText } from '../../utils/adminDisplayText';

const BATCH_SIZE = 12;
const CONCURRENCY = 4;
type DroneOption = { id: string; name?: string };
type Scan = {
    active: boolean; busy: boolean; ready: boolean; drones: DroneOption[];
    cursor: number; failed: string[]; items: Map<string, HistoryWork>; error?: string;
};
type View = {
    key: string; loading: boolean; data?: { items: HistoryWork[]; partial: boolean };
    drones: DroneOption[]; scanned: number; total: number; failed: number; error?: string;
};
const initial = (key: string): View => ({key, loading: true, drones: [], scanned: 0, total: 0, failed: 0});

/** Read only a bounded group per click. A departed page cannot start another group. */
export function useWorkHistory(drone: string) {
    const [revision, setRevision] = useState(0);
    const key = JSON.stringify([drone, revision]);
    const session = useRef<Scan | null>(null);
    const [view, setView] = useState<View>(() => initial(key));
    function publish(s: Scan) {
        if (!s.active) return;
        setView({ key, loading: s.busy, drones: s.drones, scanned: s.cursor, total: s.drones.length,
            failed: s.failed.length, error: s.error,
            data: s.ready ? {items: [...s.items.values()], partial: s.failed.length > 0} : undefined });
    }
    async function next(s: Scan) {
        if (!s.active || s.busy || !s.ready || s.cursor >= s.drones.length) return;
        s.busy = true; publish(s);
        const end = Math.min(s.cursor + BATCH_SIZE, s.drones.length);
        try {
            while (s.active && s.cursor < end) {
                const group = s.drones.slice(s.cursor, Math.min(s.cursor + CONCURRENCY, end));
                const results = await Promise.allSettled(group.map(d => workHistory(d.id)));
                if (!s.active) return;
                results.forEach((result, i) => {
                    if (result.status === 'fulfilled') {
                        for (const work of result.value.items) s.items.set(work.id, work);
                    } else s.failed.push(group[i].id);
                });
                s.cursor += group.length;
                // Publish after each wave; do not wait for the entire fleet or even the batch.
                publish(s);
            }
        } finally {
            s.busy = false;
            publish(s);
        }
    }
    useEffect(() => {
        const s: Scan = {active: true, busy: true, ready: false, drones: [], cursor: 0, failed: [], items: new Map()};
        session.current = s;
        publish(s);
        void (async () => {
            try {
                const drones = drone ? [{id: drone}] : await workHistoryDrones();
                if (!s.active) return;
                s.drones = drones; s.ready = true; s.busy = false; publish(s);
                await next(s);
            } catch (e) {
                if (!s.active) return;
                s.busy = false;
                s.error = adminErrorText(e, 'Unable to load work orders. Please try again.');
                publish(s);
            }
        })();
        return () => { s.active = false; if (session.current === s) session.current = null; };
        // key is the explicit scope and refresh revision; callbacks only use that session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    const current = view.key === key ? view : initial(key);
    return { ...current,
        reload: () => {
            if (session.current) session.current.active = false;
            invalidateAdminReads('/admin/fleet/drones');
            setRevision(x => x + 1);
        },
        loadMore: () => { const s = session.current; if (s) void next(s); },
        hasMore: current.scanned < current.total,
    };
}
