import { useEffect, useMemo, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { ClipboardList, Clock3, PackageCheck, Truck, CircleCheckBig, Ban } from 'lucide-react';

import { ActionButton } from '../../../../components/ui/ActionButton';

import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';

import { OperatorPanel } from '../../../operator/components/OperatorPanel';

import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';

import { AdminPageShell } from '../../components/AdminPageShell';

import { AdminToolbar } from '../../components/AdminToolbar';

import './ReplacementRecordsDialog.css';

import { getAdminHubs, getAdminBatteries } from '../../services/adminStore';

import { getReplacementRequests, getSpareParts, type ReplacementRequest } from '../../services/prototypeWorkflow';

import {

  getAdminEffectiveStatus, getAdminSupplyRecord, getMatchingBatteryOptions,

  getMatchingPartOptions, getRequestDroneModel, rejectReplacementRequest, supplyApprovedReplacement,

  type AdminEffectiveStatus,

} from '../../services/adminReplacementSupply';

// Three supply stages plus Rejected as a terminal exception before supply.

const labels: Record<AdminEffectiveStatus, string> = {

  AWAITING_SUPPLY: 'Awaiting supply', SUPPLIED: 'Supplied', RECEIVED: 'Received',

  REJECTED: 'Rejected',

};

// Match the Technician Work Orders status presentation: colored text, no outlined badge.

// Rejected stays visible for both previous records and new Admin decisions.

const statusTextColors: Record<AdminEffectiveStatus, string> = {

  AWAITING_SUPPLY: 'text-orange-500',

  SUPPLIED: 'text-blue-500',

  RECEIVED: 'text-emerald-500',

  REJECTED: 'text-red-500',

};

function ReplacementStatusText({ status }: { status: AdminEffectiveStatus }) {

  return <span className={`whitespace-nowrap text-[13px] font-semibold ${statusTextColors[status]}`}>

    {labels[status]}

  </span>;

}

const time = (date?: string) => date ? new Date(date).toLocaleString('en-GB') : '—';

const adminDialogFont = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const selectClass = 'h-10 w-full min-w-0 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[13px] text-[var(--admin-text)] outline-none focus:border-[#FF6B00]';

function ReplacementMetric({ label, value, note, icon: Icon }: {

  label: string;

  value: number;

  note: string;

  icon: typeof Clock3;

}) {

  return <div className="min-w-0 px-4 py-3" style={{

    backgroundColor: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: 12,

    boxShadow: '0 8px 22px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.05)',

    minHeight: 112,
