import * as Dialog from '@radix-ui/react-dialog';
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import './AdminConfirmDialog.css';

type ConfirmOptions = { title: string; message: string; confirmLabel: string };
type PendingConfirmation = ConfirmOptions & {
  owner: symbol;
  resolve: (confirmed: boolean) => void;
  previousFocus: HTMLElement | null;
};
type ConfirmService = {
  request: (owner: symbol, options: ConfirmOptions) => Promise<boolean>;
  cancel: (owner: symbol) => void;
};
const ConfirmContext = createContext<ConfirmService | null>(null);

/** One Admin-only confirmation at a time. Navigation/unmount is cancellation,
 * never implicit approval. The actual mutation remains in its original handler. */
export function AdminConfirmProvider({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const pendingRef = useRef<PendingConfirmation | null>(null);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const cancelButton = useRef<HTMLButtonElement | null>(null);
  const settle = useCallback((confirmed: boolean, owner?: symbol) => {
    const current = pendingRef.current;
    if (!current || (owner !== undefined && current.owner !== owner)) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(confirmed);
  }, []);
  const request = useCallback((owner: symbol, options: ConfirmOptions) => {
    if (pendingRef.current) return Promise.resolve(false);
    return new Promise<boolean>(resolve => {
      const next = { ...options, owner, resolve, previousFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);
  const cancel = useCallback((owner: symbol) => settle(false, owner), [settle]);

  useLayoutEffect(() => {
    // Cancel immediately on route changes, including search-parameter changes.
    settle(false);
  }, [pathname, search, settle]);
  useLayoutEffect(() => () => {
    const current = pendingRef.current;
    pendingRef.current = null;
    current?.resolve(false);
  }, []);

  return <ConfirmContext.Provider value={{ request, cancel }}>
    {children}
    <Dialog.Root open={pending !== null} onOpenChange={open => { if (!open) settle(false); }}>
      {pending && <Dialog.Portal>
        <Dialog.Overlay className="admin-confirm-overlay" />
        <Dialog.Content
          role="alertdialog"
          className="admin-dialog-typography admin-confirm-dialog"
          onPointerDownOutside={event => event.preventDefault()}
          onOpenAutoFocus={event => {
            // Never focus the destructive/confirm action by default.
            const button = cancelButton.current;
            if (button) { event.preventDefault(); button.focus(); }
          }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            if (pending.previousFocus?.isConnected) pending.previousFocus.focus({ preventScroll: true });
          }}>
          <header className="admin-confirm-header"><Dialog.Title asChild><h2>{pending.title}</h2></Dialog.Title></header>
          <div className="admin-confirm-body"><Dialog.Description>{pending.message}</Dialog.Description></div>
          <footer className="admin-confirm-footer">
            <span ref={element => { cancelButton.current = element?.querySelector('button') ?? null; }}>
              <ActionButton variant="secondary" onClick={() => settle(false)}>Cancel</ActionButton>
            </span>
            <ActionButton variant="secondary" onClick={() => settle(true)}>{pending.confirmLabel}</ActionButton>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>}
    </Dialog.Root>
  </ConfirmContext.Provider>;
}

export function useAdminConfirm() {
  const service = useContext(ConfirmContext);
  if (!service) throw new Error('AdminConfirmProvider is required.');
  const { request, cancel } = service;
  const owner = useRef(Symbol('admin-confirm'));
  useLayoutEffect(() => { const id = owner.current; return () => cancel(id); }, [cancel]);
  return useCallback((options: ConfirmOptions) => request(owner.current, options), [request]);
}
