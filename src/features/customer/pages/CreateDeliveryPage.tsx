import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  PACKAGE_CATEGORIES,
  PACKAGE_SIZE_RULES,
  VIETNAM_LOCATIONS,
} from "../data/customerData";
import { customerDeliveryService } from "../services/customerDeliveryService";
import { customerProfileService } from "../services/customerProfileService";
import type { DeliveryDraft, PackageSize } from "../types/customer";

const steps = ["Details", "Package", "Route", "Schedule"];

function getDefaultDraft(name: string, phone: string): DeliveryDraft {
  return {
    senderName: name,
    senderPhone: phone,
    recipientName: "",
    recipientPhone: "",
    packageCategory: "food",
    packageDescription: "",
    weightKg: 1,
    packageSize: "S",
    originArea: "",
    destinationArea: "",
    deliveryMode: "express",
    requestedDepartureAt: "",
  };
}

function getMinimumScheduleValue() {
  const date = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateDeliveryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const profile = user
    ? customerProfileService.get(user.id)
    : {
        phone: "",
      };

  const existingDraft = customerDeliveryService.getDraft();

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState<DeliveryDraft>(
    existingDraft ?? getDefaultDraft(user?.name ?? "", profile.phone),
  );

  useEffect(() => {
    customerDeliveryService.saveDraft(form);
  }, [form]);

  const preview = useMemo(() => {
    if (!form.originArea || !form.destinationArea) {
      return null;
    }

    return customerDeliveryService.preview(form);
  }, [form]);

  const update = <K extends keyof DeliveryDraft>(
    key: K,
    value: DeliveryDraft[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setError("");
  };

  const validateStep = () => {
    setError("");

    if (step === 0) {
      if (
        !form.senderPhone.trim() ||
        !form.recipientName.trim() ||
        !form.recipientPhone.trim()
      ) {
        setError("Please complete all sender and recipient information.");
        return false;
      }

      if (
        form.senderPhone.trim().length < 9 ||
        form.recipientPhone.trim().length < 9
      ) {
        setError("Please enter valid phone numbers.");
        return false;
      }
    }

    if (step === 1) {
      if (form.weightKg <= 0 || form.weightKg > 12) {
        setError(
          "Package weight must be greater than 0 kg and must not exceed 12 kg.",
        );
        return false;
      }

      if (
        form.packageCategory === "other" &&
        !form.packageDescription.trim()
      ) {
        setError("Please describe the package contents.");
        return false;
      }
    }

    if (step === 2) {
      if (!form.originArea.trim() || !form.destinationArea.trim()) {
        setError("Please enter both sending and receiving locations.");
        return false;
      }

      if (form.originArea.trim() === form.destinationArea.trim()) {
        setError("Origin and destination cannot be the same location.");
        return false;
      }
    }

    if (step === 3 && form.deliveryMode === "scheduled") {
      if (!form.requestedDepartureAt) {
        setError("Please select a preferred departure time.");
        return false;
      }

      const minimum = new Date(Date.now() + 3 * 60 * 60 * 1000);

      if (new Date(form.requestedDepartureAt) < minimum) {
        setError("Scheduled departure must be at least 3 hours from now.");
        return false;
      }
    }

    return true;
  };

  const next = () => {
    if (!validateStep()) {
      return;
    }

    if (step === 0 && user) {
      customerProfileService.save(user.id, {
        phone: form.senderPhone.trim(),
      });
    }

    if (step === steps.length - 1) {
      customerDeliveryService.saveDraft(form);
      navigate("/customer/deliveries/review");
      return;
    }

    setStep((current) => current + 1);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent font-sans">
      <div className="mx-auto max-w-[1500px] px-6 py-10 lg:px-10 lg:py-12">
        <header>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-500">
            New delivery
          </p>

          <h1 className="mt-3 text-[38px] font-semibold tracking-[-0.04em] text-white lg:text-[44px]">
            Create delivery
          </h1>

          <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-white/[0.58]">
            Enter package information, choose your delivery areas and schedule
            a hub-to-hub delivery.
          </p>
        </header>

        <div className="mt-9 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {steps.map((label, index) => {
              const active = index === step;
              const completed = index < step;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (index <= step) {
                      setStep(index);
                      setError("");
                    }
                  }}
                  className={`relative px-5 py-4 text-left transition md:px-6 ${
                    active
                      ? "bg-white/[0.035]"
                      : "hover:bg-white/[0.018]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition ${
                        active || completed
                          ? "bg-orange-500 text-black"
                          : "border border-white/[0.12] text-white/[0.48]"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </span>

                    <div>
                      <p
                        className={`text-[14px] font-medium ${
                          active
                            ? "text-white"
                            : completed
                              ? "text-white/[0.76]"
                              : "text-white/[0.48]"
                        }`}
                      >
                        {label}
                      </p>

                      <p className="mt-0.5 hidden text-[11px] text-white/[0.25] lg:block">
                        {getStepCaption(index)}
                      </p>
                    </div>
                  </div>

                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-[2px] bg-orange-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 p-6 shadow-[0_14px_34px_rgba(0,0,0,0.30)] backdrop-blur-sm lg:p-8">
            {step === 0 && <ContactStep form={form} update={update} />}
            {step === 1 && <PackageStep form={form} update={update} />}
            {step === 2 && <RouteStep form={form} update={update} />}
            {step === 3 && <ScheduleStep form={form} update={update} />}

            {error && (
              <div
                className="mt-7 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] leading-6 text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="mt-10 flex items-center justify-between border-t border-white/[0.08] pt-6">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => {
                  setStep((current) => Math.max(0, current - 1));
                  setError("");
                }}
                className="inline-flex h-12 items-center gap-2 rounded-lg px-5 text-[14px] font-medium text-white/[0.62] transition hover:bg-white/[0.04] hover:text-white disabled:pointer-events-none disabled:opacity-0"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <button
                type="button"
                onClick={next}
                className="group inline-flex h-12 items-center gap-3 rounded-lg bg-orange-500 px-7 text-[14px] font-semibold text-black transition hover:bg-orange-400"
              >
                {step === steps.length - 1 ? "Review delivery" : "Continue"}

                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 p-6 shadow-[0_14px_34px_rgba(0,0,0,0.30)] backdrop-blur-sm lg:sticky lg:top-[96px]">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.15em] text-white/[0.58]">
                Delivery summary
              </p>

              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white/[0.54]">
                Draft
              </span>
            </div>

            <div className="mt-5">
              <SummaryItem label="Weight" value={`${form.weightKg || 0} kg`} />
              <SummaryItem label="Package size" value={form.packageSize} />
              <SummaryItem
                label="Delivery mode"
                value={form.deliveryMode === "express" ? "Express" : "Scheduled"}
              />

              {preview && (
                <>
                  <SummaryItem label="Origin hub" value={preview.originHub.name} />
                  <SummaryItem
                    label="Destination hub"
                    value={preview.destinationHub.name}
                  />
                </>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-orange-500/[0.16] bg-orange-500/[0.05] p-5">
              <p className="text-[14px] font-semibold text-orange-400">
                3-hour handover requirement
              </p>

              <p className="mt-3 text-[12px] leading-6 text-white/[0.42]">
                Bring your package to the recommended origin hub within 3 hours
                after placing the order.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  form: DeliveryDraft;
  update: <K extends keyof DeliveryDraft>(
    key: K,
    value: DeliveryDraft[K],
  ) => void;
}

function ContactStep({ form, update }: StepProps) {
  return (
    <section>
      <SectionTitle
        title="Sender and recipient"
        description="Confirm the sender information and enter the details of the person receiving the package."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <ContactGroup
          title="Sender"
          description="Your registered account information."
        >
          <Field label="Full name" value={form.senderName} readOnly />

          <Field
            label="Phone number"
            value={form.senderPhone}
            placeholder="090 123 4567"
            inputMode="tel"
            onChange={(value) => update("senderPhone", value)}
          />
        </ContactGroup>

        <ContactGroup
          title="Recipient"
          description="Who will collect the package at the destination."
        >
          <Field
            label="Full name"
            value={form.recipientName}
            placeholder="Recipient name"
            onChange={(value) => update("recipientName", value)}
          />

          <Field
            label="Phone number"
            value={form.recipientPhone}
            placeholder="090 987 6543"
            inputMode="tel"
            onChange={(value) => update("recipientPhone", value)}
          />
        </ContactGroup>
      </div>
    </section>
  );
}

function PackageStep({ form, update }: StepProps) {
  return (
    <section>
      <SectionTitle
        title="Package information"
        description="Provide the package category, weight and physical size so the system can validate aircraft capacity."
      />

      <div className="mt-8">
        <label className="block">
          <FieldLabel>Package category</FieldLabel>

          <select
            value={form.packageCategory}
            onChange={(event) =>
              update(
                "packageCategory",
                event.target.value as DeliveryDraft["packageCategory"],
              )
            }
            className="mt-2.5 h-[54px] w-full rounded-lg border border-white/[0.1] bg-[#111116] px-4 text-[15px] text-white outline-none transition hover:border-white/[0.17] focus:border-orange-500"
          >
            {PACKAGE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {form.packageCategory === "other" && (
          <div className="mt-6">
            <Field
              label="Package description"
              value={form.packageDescription}
              placeholder="Describe the package contents"
              onChange={(value) => update("packageDescription", value)}
            />
          </div>
        )}

        <div className="mt-7">
          <FieldLabel>Package weight</FieldLabel>

          <div className="mt-2.5 flex h-[54px] overflow-hidden rounded-lg border border-white/[0.1] bg-[#111116] transition hover:border-white/[0.17] focus-within:border-orange-500">
            <input
              type="number"
              min="0.1"
              max="12"
              step="0.1"
              value={form.weightKg}
              onChange={(event) => update("weightKg", Number(event.target.value))}
              className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-white outline-none"
            />

            <div className="flex items-center border-l border-white/[0.08] px-4 text-[13px] text-white/[0.54]">
              kg
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-white/[0.42]">Maximum aircraft payload</p>

            <p
              className={`text-[11px] font-medium ${
                form.weightKg > 12 ? "text-red-400" : "text-white/[0.54]"
              }`}
            >
              {form.weightKg || 0}/12 kg
            </p>
          </div>
        </div>

        <div className="mt-8">
          <FieldLabel>Package size</FieldLabel>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(PACKAGE_SIZE_RULES) as PackageSize[]).map((size) => {
              const active = form.packageSize === size;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => update("packageSize", size)}
                  className={`rounded-lg border p-4 text-left transition ${
                    active
                      ? "border-orange-500 bg-orange-500/[0.055]"
                      : "border-white/[0.08] bg-[#111116] hover:border-white/[0.18]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-[20px] font-semibold ${
                        active ? "text-orange-400" : "text-white/[0.80]"
                      }`}
                    >
                      {size}
                    </p>

                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? "bg-orange-500" : "bg-white/10"
                      }`}
                    />
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-white/[0.48]">
                    {PACKAGE_SIZE_RULES[size].dimensions}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg border border-white/[0.07] bg-[#111116] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-white/[0.48]">Selected size</p>
                <p className="mt-1 text-[14px] font-medium text-white/[0.80]">
                  Size {form.packageSize}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-white/[0.48]">Maximum dimensions</p>
                <p className="mt-1 text-[13px] text-white/[0.70]">
                  {PACKAGE_SIZE_RULES[form.packageSize].dimensions}
                </p>
              </div>
            </div>

            <p className="mt-4 border-t border-white/[0.06] pt-4 text-[11px] leading-5 text-white/[0.48]">
              {PACKAGE_SIZE_RULES[form.packageSize].description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RouteStep({ form, update }: StepProps) {
  const preview =
    form.originArea && form.destinationArea
      ? customerDeliveryService.preview(form)
      : null;

  return (
    <section>
      <SectionTitle
        title="Delivery route"
        description="Enter the sender and recipient areas. DroneOptAI will recommend the most suitable origin and destination hubs."
      />

      <datalist id="vietnam-locations">
        {VIETNAM_LOCATIONS.map((location) => (
          <option key={location} value={location} />
        ))}
      </datalist>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <LocationField
          label="Sending area"
          value={form.originArea}
          placeholder="Example: Go Vap, Ho Chi Minh City"
          onChange={(value) => update("originArea", value)}
        />

        <LocationField
          label="Receiving area"
          value={form.destinationArea}
          placeholder="Example: Thu Duc, Ho Chi Minh City"
          onChange={(value) => update("destinationArea", value)}
        />
      </div>

      {!preview && (
        <div className="mt-7 rounded-lg border border-dashed border-white/[0.08] px-5 py-8 text-center">
          <p className="text-[13px] text-white/[0.54]">
            Enter both locations to see the recommended hub route.
          </p>
        </div>
      )}

      {preview && (
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-orange-500" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-orange-400">
              Recommended route
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_46px_1fr] md:items-center">
            <HubBlock
              label="Origin hub"
              name={preview.originHub.name}
              address={preview.originHub.address}
            />

            <div className="hidden items-center justify-center md:flex">
              <ArrowRight size={18} className="text-white/[0.25]" />
            </div>

            <HubBlock
              label="Destination hub"
              name={preview.destinationHub.name}
              address={preview.destinationHub.address}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ScheduleStep({ form, update }: StepProps) {
  const minimumSchedule = getMinimumScheduleValue();

  return (
    <section>
      <SectionTitle
        title="Delivery time"
        description="Choose Express for the earliest available delivery or schedule a preferred departure time."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ModeButton
          active={form.deliveryMode === "express"}
          title="Express"
          description="The system schedules the earliest available flight after your package reaches the origin hub."
          onClick={() => update("deliveryMode", "express")}
        />

        <ModeButton
          active={form.deliveryMode === "scheduled"}
          title="Scheduled"
          description="Choose a preferred departure time at least 3 hours from now."
          onClick={() => update("deliveryMode", "scheduled")}
        />
      </div>

      {form.deliveryMode === "scheduled" && (
        <div className="mt-7 max-w-[460px]">
          <FieldLabel>Preferred departure</FieldLabel>

          <input
            type="datetime-local"
            min={minimumSchedule}
            value={form.requestedDepartureAt}
            onChange={(event) =>
              update("requestedDepartureAt", event.target.value)
            }
            className="mt-2.5 h-[54px] w-full rounded-lg border border-white/[0.1] bg-[#111116] px-4 text-[15px] text-white outline-none transition hover:border-white/[0.17] focus:border-orange-500"
          />

          <p className="mt-2 text-[11px] leading-5 text-white/[0.42]">
            Scheduled departure must be at least 3 hours from the current time.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-orange-500/[0.14] bg-orange-500/[0.045] p-5">
        <div className="flex gap-4">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-black">
            !
          </div>

          <div>
            <p className="text-[14px] font-semibold text-white/[0.85]">
              Package handover policy
            </p>

            <p className="mt-2 max-w-[650px] text-[12px] leading-6 text-white/[0.42]">
              After placing the order, the package must be delivered to the
              assigned origin hub within 3 hours. If the package arrives after
              the deadline, the requested delivery time may be moved to the
              next available flight slot.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-white/[0.08] pb-6">
      <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-white">
        {title}
      </h2>

      <p className="mt-3 max-w-[680px] text-[14px] leading-6 text-white/[0.45]">
        {description}
      </p>
    </div>
  );
}

function ContactGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-[#111116] p-6 shadow-[0_8px_22px_rgba(0,0,0,0.18)]">
      <div className="border-b border-white/[0.07] pb-5">
        <p className="text-[16px] font-semibold text-white/[0.85]">{title}</p>

        <p className="mt-2 text-[12px] leading-5 text-white/[0.48]">
          {description}
        </p>
      </div>

      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[13px] font-medium text-white/[0.68]">{children}</span>
  );
}

type FieldInputMode =
  | "none"
  | "text"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal"
  | "search";

function Field({
  label,
  value,
  placeholder,
  onChange,
  readOnly,
  inputMode,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  inputMode?: FieldInputMode;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <input
        value={value}
        readOnly={readOnly}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className={`mt-2.5 h-[54px] w-full rounded-lg border px-4 text-[15px] outline-none transition ${
          readOnly
            ? "cursor-not-allowed border-white/[0.07] bg-white/[0.025] text-white/[0.62]"
            : "border-white/[0.1] bg-[#15151b] text-white placeholder:text-white/[0.22] hover:border-white/[0.17] focus:border-orange-500"
        }`}
      />
    </label>
  );
}

function LocationField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <input
        list="vietnam-locations"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2.5 h-[54px] w-full rounded-lg border border-white/[0.1] bg-[#111116] px-4 text-[15px] text-white outline-none transition placeholder:text-white/[0.22] hover:border-white/[0.17] focus:border-orange-500"
      />
    </label>
  );
}

function HubBlock({
  label,
  name,
  address,
}: {
  label: string;
  name: string;
  address: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#15151b] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/[0.42]">
        {label}
      </p>

      <p className="mt-2 text-[15px] font-semibold text-white/[0.85]">{name}</p>

      <p className="mt-2 text-[11px] leading-5 text-white/[0.48]">{address}</p>
    </div>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-5 text-left transition ${
        active
          ? "border-orange-500 bg-orange-500/[0.05]"
          : "border-white/[0.09] bg-[#111116] hover:border-white/[0.18]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-white/[0.85]">{title}</p>

        <span
          className={`h-2.5 w-2.5 rounded-full border ${
            active
              ? "border-orange-500 bg-orange-500"
              : "border-white/[0.20] bg-transparent"
          }`}
        />
      </div>

      <p className="mt-2 text-[12px] leading-6 text-white/[0.38]">
        {description}
      </p>
    </button>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/[0.07] py-5 last:border-b-0">
      <span className="text-[13px] text-white/[0.4]">{label}</span>

      <span className="max-w-[180px] text-right text-[15px] font-medium text-white/[0.8]">
        {value}
      </span>
    </div>
  );
}

function getStepCaption(index: number) {
  switch (index) {
    case 0:
      return "Sender & recipient";
    case 1:
      return "Package details";
    case 2:
      return "Hub recommendation";
    case 3:
      return "Delivery time";
    default:
      return "";
  }
}
