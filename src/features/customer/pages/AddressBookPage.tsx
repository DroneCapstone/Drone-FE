import { ArrowLeft, Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { customerApi } from "../services/customerApi";

type SavedAddress = {
  id: number;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string | null;
  hub_id: number | null;
  is_default: boolean;
  created_at: string;
};

type FormState = {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string;
  is_default: boolean;
};

const emptyForm = (): FormState => ({
  label: "", recipient_name: "", recipient_phone: "",
  recipient_email: "", is_default: false,
});

/* =========================================================
   ADDRESS BOOK PAGE
   Route: /customer/addresses
========================================================= */
export function AddressBookPage() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load
  useEffect(() => {
    setLoading(true);
    customerApi.getAddresses()
      .then((data) => { setAddresses(data); setError(""); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load addresses"))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setSaveError(""); setModalOpen(true); };
  const openEdit = (a: SavedAddress) => {
    setEditing(a);
    setForm({
      label: a.label, recipient_name: a.recipient_name,
      recipient_phone: a.recipient_phone,
      recipient_email: a.recipient_email ?? "",
      is_default: a.is_default,
    });
    setSaveError(""); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.recipient_name.trim() || !form.recipient_phone.trim()) {
      setSaveError("Label, name and phone are required.");
      return;
    }
    setSaving(true); setSaveError("");
    try {
      const payload = {
        label: form.label.trim(),
        recipient_name: form.recipient_name.trim(),
        recipient_phone: form.recipient_phone.trim(),
        recipient_email: form.recipient_email.trim() || undefined,
        is_default: form.is_default,
      };
      if (editing) {
        const updated = await customerApi.updateAddress(editing.id, payload);
        setAddresses((prev) => prev.map((a) => a.id === editing.id ? updated : (form.is_default ? { ...a, is_default: false } : a)));
      } else {
        const created = await customerApi.createAddress(payload);
        setAddresses((prev) => [
          created,
          ...(form.is_default ? prev.map((a) => ({ ...a, is_default: false })) : prev),
        ]);
      }
      setModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await customerApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      {/* Back */}
      <button type="button" onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1.5 text-[12px] font-medium text-white/[0.44] transition hover:text-white">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[34px]">
            Saved Addresses
          </h1>
          <p className="mt-2 text-[13px] text-white/[0.44]">Save recipient details for faster order creation.</p>
        </div>
        <button type="button" onClick={openCreate}
          className="mt-1 flex h-10 shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[13px] font-semibold text-black transition hover:bg-orange-400">
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Content */}
      <div className="mt-8">
        {loading && (
          <p className="text-[13px] text-white/[0.44]">Loading…</p>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-300">{error}</div>
        )}
        {!loading && !error && addresses.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#161217]/94 px-6 py-10 text-center">
            <p className="text-[14px] font-medium text-white/[0.56]">No saved addresses yet.</p>
            <button type="button" onClick={openCreate}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/30 px-4 text-[13px] font-semibold text-orange-400 transition hover:bg-orange-500/20">
              <Plus size={14} /> Add your first address
            </button>
          </div>
        )}

        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.10] bg-[#161217]/94 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-white/[0.90]">{a.label}</span>
                  {a.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                      <Star size={9} className="fill-orange-400" /> Default
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-white/[0.60]">{a.recipient_name} · {a.recipient_phone}</p>
                {a.recipient_email && (
                  <p className="text-[11px] text-white/[0.36]">{a.recipient_email}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => openEdit(a)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.10] text-white/[0.44] transition hover:text-white">
                  <Pencil size={13} />
                </button>
                <button type="button" onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.10] text-white/[0.44] transition hover:text-red-400 disabled:opacity-40">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
              <h2 className="text-[16px] font-semibold text-white">
                {editing ? "Edit address" : "New address"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-white/[0.40] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {[
                { label: "Label (e.g. Home, Office)", key: "label", placeholder: "Home" },
                { label: "Recipient name", key: "recipient_name", placeholder: "Nguyen Van A" },
                { label: "Phone number", key: "recipient_phone", placeholder: "0901234567" },
                { label: "Email (optional)", key: "recipient_email", placeholder: "example@email.com" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.36]">{label}</label>
                  <input
                    type="text" value={String(form[key as keyof FormState] ?? "")} placeholder={placeholder}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-[13px] text-white placeholder-white/[0.22] outline-none focus:border-orange-500/50"
                  />
                </div>
              ))}

              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={form.is_default}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="h-4 w-4 accent-orange-500" />
                <span className="text-[13px] text-white/[0.78]">Set as default address</span>
              </label>

              {saveError && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] text-red-300">{saveError}</p>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/[0.08] px-6 py-4">
              <button type="button" onClick={() => setModalOpen(false)}
                className="flex-1 h-11 rounded-xl border border-white/[0.12] text-[13px] font-medium text-white/[0.60] hover:border-white/[0.24]">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex-1 h-11 rounded-xl bg-orange-500 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:opacity-40">
                {saving ? "Saving…" : (editing ? "Save changes" : "Add address")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
