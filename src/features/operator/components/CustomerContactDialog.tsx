import { useEffect, useState } from 'react';
import { ActionButton } from '../../../components/ui/ActionButton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../../components/ui/Dialog';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import type {
  CustomerContactChannel,
  CustomerContactOutcome,
} from '../types/operator';

interface CustomerContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerPhone: string;
  onSave: (
    channel: CustomerContactChannel,
    outcome: CustomerContactOutcome,
    note?: string,
  ) => void;
}

export function CustomerContactDialog({
  open,
  onOpenChange,
  customerName,
  customerPhone,
  onSave,
}: CustomerContactDialogProps) {
  const [channel, setChannel] = useState<CustomerContactChannel>('Phone');
  const [outcome, setOutcome] = useState<CustomerContactOutcome>('Reached');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setChannel('Phone');
    setOutcome('Reached');
    setNote('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold">Record customer contact</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {customerName} · {customerPhone}
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Channel</span>
              <DropdownSelect
                value={channel}
                options={['Phone', 'SMS']}
                onChange={(value) => setChannel(value as CustomerContactChannel)}
                ariaLabel="Contact channel"
                className="w-full"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Outcome</span>
              <DropdownSelect
                value={outcome}
                options={['Reached', 'No Answer', 'Will Pick Up', 'Sent', 'Failed']}
                onChange={(value) => setOutcome(value as CustomerContactOutcome)}
                ariaLabel="Contact outcome"
                className="w-full"
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm">
            <span className="font-medium">Note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Example: Customer confirmed pickup before 18:00."
              className="min-h-24 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
          </label>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            The ready-for-pickup app notification is automatic. This form records manual follow-up by Operator when the customer misses the expected pickup time.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            onClick={() => {
              onSave(channel, outcome, note);
              onOpenChange(false);
            }}
          >
            Save contact
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
