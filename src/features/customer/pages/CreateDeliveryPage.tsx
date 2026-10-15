import {

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from "react";

import { ArrowLeft, ArrowRight } from "lucide-react";

import {

  useNavigate,

  useSearchParams,

} from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import {

  PACKAGE_CATEGORIES,

  PACKAGE_SIZE_RULES,

} from "../data/customerData";

import {

  customerDeliveryService,

  formatVnd,

} from "../services/customerDeliveryService";

import { customerProfileService } from "../services/customerProfileService";

import type {

  DeliveryDraft,

  DeliveryHub,

  DeliveryPrice,

  PackageSize,

} from "../types/customer";

type DeliveryDraftWithPricing = Omit<

  DeliveryDraft,

  | "packageCategory"

  | "weightKg"

  | "packageSize"

  | "deliveryMode"

> & {

  packageCategory:

  | DeliveryDraft["packageCategory"]

  | "";

  weightKg: number | "";

  packageSize: PackageSize | "";

  deliveryMode:

  | DeliveryDraft["deliveryMode"]

  | "";

  hasInsurance?: boolean;

  draftVersion: 5;

};

const steps = ["Details", "Package", "Route", "Schedule"];

const PENDING_CHECKOUT_KEY =
  "droneoptai.customer.pending-checkout-order";

function getDefaultDraft(

  name: string,

  phone: string,

): DeliveryDraftWithPricing {

  return {

    senderName: name,

    senderPhone: phone,

    recipientName: "",

    recipientEmail: "",

    packageCategory: "",

    packageDescription: "",

    weightKg: "",

    packageSize: "",

    hasInsurance: false,

    originArea: "",

    destinationArea: "",

    deliveryMode: "",

    requestedDepartureAt: "",

    draftVersion: 5,

  };

}

function getMinimumScheduleValue() {

  const date = new Date(

    Date.now() + 3 * 60 * 60 * 1000,

  );

  const pad = (value: number) =>

    String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(

    date.getMonth() + 1,

  )}-${pad(date.getDate())}T${pad(

    date.getHours(),

  )}:${pad(date.getMinutes())}`;

}

/* =========================================================

   CREATE DELIVERY PAGE

========================================================= */

export function CreateDeliveryPage() {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const { user } = useAuth();

  const profile = user

    ? customerProfileService.get(user.id)

    : {

      phone: "",

    };

  const stepParam =

    searchParams.get("step");

  const isNewDelivery =

    searchParams.get("new") === "1";

  const storedDraft =

    customerDeliveryService.getDraft() as

    | DeliveryDraftWithPricing

    | null;

  const existingDraft =

    !isNewDelivery &&

      storedDraft?.draftVersion === 5

      ? storedDraft

      : null;

  const requestedStep = Number(

    stepParam ?? "0",

  );

  const initialStep =

    Number.isInteger(requestedStep) &&

      requestedStep >= 0 &&

      requestedStep < steps.length

      ? requestedStep

      : 0;

  const [step, setStep] = useState(initialStep);

  const [error, setError] = useState("");

  const [hubs, setHubs] = useState<DeliveryHub[]>(

    () => customerDeliveryService.getCachedHubs(),

  );

  const [hubsLoading, setHubsLoading] = useState(false);

  const [estimateLoading, setEstimateLoading] = useState(false);

  const [estimateError, setEstimateError] = useState("");

  const [preview, setPreview] = useState(

    () =>

      isNewDelivery

        ? null

        : customerDeliveryService.getCachedEstimate(),

  );

  const [form, setForm] =

    useState<DeliveryDraftWithPricing>(

      existingDraft ??

      getDefaultDraft(

        user?.name ?? "",

        profile.phone,

      ),

    );

  useEffect(() => {

    if (!isNewDelivery) {

      return;

    }

    /*

     * Explicit "Create delivery" entry point.

     *

     * Clear the previous order draft and estimate, then start a

     * completely fresh form. Sender account information can stay

     * prefilled, while recipient/package/route/schedule fields reset.

     */

    customerDeliveryService.clearDraft();


    /*
     * A brand-new delivery must never inherit the order/payment id
     * from a previous unpaid checkout.
     *
     * Keep delivery history in localStorage; only clear this transient
     * checkout pointer.
     */
    window.sessionStorage.removeItem(
      PENDING_CHECKOUT_KEY,
    );

    setForm(

      getDefaultDraft(

        user?.name ?? "",

        profile.phone,

      ),

    );

    setPreview(null);

    setStep(0);

    setError("");

    setEstimateError("");

    /*

     * Remove ?new=1 after the reset. This prevents a refresh from

     * resetting the form again while the customer is filling it.

     */

    navigate(

      "/customer/deliveries/create",

      {

        replace: true,

      },

    );

  }, [

    isNewDelivery,

    navigate,

    profile.phone,

    user?.name,

  ]);

  useEffect(() => {

    /*

     * Do not save the stale previous-order form during the single

     * render where ?new=1 is being processed.

     */

    if (isNewDelivery) {

      return;

    }

    customerDeliveryService.saveDraft(

      form as unknown as DeliveryDraft,

    );

  }, [form, isNewDelivery]);

  useEffect(() => {

    /*

     * Only sync the wizard step when the URL explicitly contains

     * ?step=...

     *

     * Without this guard:

     *   searchParams.get("step") === null

     *   Number(null) === 0

     *

     * so clicking Continue from step 0 -> 1 was immediately reset

     * back to step 0.

     */

    if (

      isNewDelivery ||

      stepParam === null

    ) {

      return;

    }

    const nextStep =

      Number(stepParam);

    if (

      Number.isInteger(nextStep) &&

      nextStep >= 0 &&

      nextStep < steps.length

    ) {

      setStep(nextStep);

      setError("");

    }

  }, [

    isNewDelivery,

    stepParam,

  ]);

  useEffect(() => {

    let cancelled = false;

    async function loadHubs() {

      setHubsLoading(true);

      try {

        const next = await customerDeliveryService.loadHubs();

        if (!cancelled) setHubs(next);

      } catch (requestError) {

        if (!cancelled) {

          setEstimateError(

            requestError instanceof Error

              ? requestError.message

              : "Unable to load hubs.",

          );

        }

      } finally {

        if (!cancelled) setHubsLoading(false);

      }

    }

    loadHubs();

    return () => {

      cancelled = true;

    };

  }, []);

  useEffect(() => {

    if (!user) return;

    customerProfileService

      .loadRemote(user.id)

      .then((remoteProfile) => {

        if (!form.senderPhone && remoteProfile.phone) {

          setForm((current) => ({

            ...current,

            senderPhone: remoteProfile.phone,

          }));

        }

      })

      .catch(() => {

        // Keep cached/local profile when profile API is unavailable.

      });

  }, [user]);

  const selectedOriginHub = useMemo(

    () =>

      hubs.find((hub) => String(hub.id) === form.originArea) ?? null,

    [hubs, form.originArea],

  );

  const selectedDestinationHub = useMemo(

    () =>

      hubs.find((hub) => String(hub.id) === form.destinationArea) ?? null,

    [hubs, form.destinationArea],

  );

  const estimateReady = Boolean(

    form.packageCategory &&

    form.weightKg !== "" &&

    form.packageSize &&

    form.originArea &&

    form.destinationArea &&

    form.originArea !== form.destinationArea &&

    form.deliveryMode &&

    (form.deliveryMode !== "scheduled" || form.requestedDepartureAt),

  );

  useEffect(() => {

    if (!estimateReady) {

      setPreview(null);

      setEstimateError("");

      customerDeliveryService.clearEstimate();

      return;

    }

    const timer = window.setTimeout(async () => {

      setEstimateLoading(true);

      setEstimateError("");

      try {

        const next = await customerDeliveryService.estimateRemote(

          form as unknown as DeliveryDraft,

          hubs,

        );

        setPreview(next);

      } catch (requestError) {

        setPreview(null);

        setEstimateError(

          requestError instanceof Error

            ? requestError.message

            : "Unable to estimate this delivery.",

        );

      } finally {

        setEstimateLoading(false);

      }

    }, 350);

    return () => window.clearTimeout(timer);

  }, [

    estimateReady,

    form.packageCategory,

    form.weightKg,

    form.packageSize,

    form.hasInsurance,

    form.originArea,

    form.destinationArea,

    form.deliveryMode,

    form.requestedDepartureAt,

    hubs,

  ]);

  const pricingReady = Boolean(preview);

  const update = <

    K extends keyof DeliveryDraftWithPricing,

  >(

    key: K,

    value: DeliveryDraftWithPricing[K],

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

        !form.recipientEmail.trim()

      ) {

        setError(

          "Please complete all sender and recipient information.",

        );

        return false;

      }

      if (form.senderPhone.trim().length < 9) {
        setError("Please enter a valid sender phone number.");
        return false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail.trim())) {
        setError("Please enter a valid recipient email address.");
        return false;
      }

    }

    if (step === 1) {

      if (!form.packageCategory) {

        setError(

          "Please select a package category.",

        );

        return false;

      }

      if (

        form.weightKg === "" ||

        form.weightKg <= 0 ||

        form.weightKg > 10

      ) {

        setError(

          "Please enter a package weight greater than 0 kg and less than or equal to 10 kg.",

        );

        return false;

      }

      if (!form.packageSize) {

        setError(

          "Please select a package size.",

        );

        return false;

      }

      if (

        form.packageCategory === "other" &&

        !form.packageDescription.trim()

      ) {

        setError(

          "Please describe the package contents.",

        );

        return false;

      }

    }

    if (step === 2) {

      if (

        !form.originArea.trim() ||

        !form.destinationArea.trim()

      ) {

        setError(

          "Please enter both sending and receiving locations.",

        );

        return false;

      }

      if (

        form.originArea.trim() ===

        form.destinationArea.trim()

      ) {

        setError(

          "Origin and destination cannot be the same location.",

        );

        return false;

      }

    }

    if (step === 3) {

      if (!form.deliveryMode) {

        setError(

          "Please select a delivery mode.",

        );

        return false;

      }

      if (

        form.deliveryMode === "scheduled" &&

        !form.requestedDepartureAt

      ) {

        setError(

          "Please select a preferred departure time.",

        );

        return false;

      }

      if (

        form.deliveryMode === "scheduled"

      ) {

        const minimum = new Date(

          Date.now() + 3 * 60 * 60 * 1000,

        );

        if (

          new Date(

            form.requestedDepartureAt,

          ) < minimum

        ) {

          setError(

            "Scheduled departure must be at least 3 hours from now.",

          );

          return false;

        }

      }

    }

    return true;

  };

  const next = async () => {

    if (!validateStep()) {

      return;

    }

    if (step === 0 && user) {

      customerProfileService.save(user.id, {

        phone: form.senderPhone.trim(),

      });

      customerProfileService

        .saveRemote(user.id, form.senderPhone.trim())

        .catch(() => {

          // Profile update failure should not block order creation.

        });

    }

    if (step === steps.length - 1) {

      if (!preview) {

        setError(

          estimateError ||

          "Please wait for the backend delivery estimate before reviewing the order.",

        );

        return;

      }

      /*
       * Clear any legacy checkout pointer again before entering Review.
       * Review must create a new backend order and navigate only with
       * the id returned by the latest POST /customer/orders.
       */
      window.sessionStorage.removeItem(
        PENDING_CHECKOUT_KEY,
      );

      customerDeliveryService.saveDraft(

        form as unknown as DeliveryDraft,

      );

      navigate(

        "/customer/deliveries/review",

      );

      return;

    }

    setStep((current) => current + 1);

  };

  const back = () => {

    setStep((current) =>

      Math.max(0, current - 1),

    );

    setError("");

  };

  return (

    <div className="min-h-[calc(100vh-72px)] bg-transparent font-sans">

      <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-6 sm:px-6 sm:py-10 lg:px-10 lg:py-12">

        {/* =================================================

            PAGE HEADER

        ================================================== */}

        <header>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500 sm:text-[12px]">

            New delivery

          </p>

          <h1 className="mt-2 text-[32px] font-bold tracking-[-0.04em] text-white sm:mt-3 sm:text-[40px] lg:text-[46px]">

            Create delivery

          </h1>

          <p className="mt-2 max-w-[680px] text-[13px] leading-5 text-white/[0.48] sm:hidden">

            Enter package details, choose your route and schedule a hub-to-hub delivery.

          </p>

        </header>

        {/* =================================================

            MOBILE PROGRESS

        ================================================== */}

        <div className="mt-6 sm:hidden">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/[0.42]">

                Step {step + 1} of {steps.length}

              </p>

              <p className="mt-1 text-[17px] font-semibold text-white">

                {steps[step]}

              </p>

            </div>

            <span className="text-[12px] font-medium text-orange-400">

              {Math.round(

                ((step + 1) / steps.length) *

                100,

              )}

              %

            </span>

          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">

            {steps.map((label, index) => {

              const active = index === step;

              const completed = index < step;

              return (

                <button

                  key={label}

                  type="button"

                  aria-label={`Go to ${label}`}

                  onClick={() => {

                    if (index <= step) {

                      setStep(index);

                      setError("");

                    }

                  }}

                  className="group"

                >

                  <span

                    className={`block h-[3px] rounded-full transition ${active || completed

                      ? "bg-orange-500"

                      : "bg-white/[0.10]"

                      }`}

                  />

                </button>

              );

            })}

          </div>

        </div>

        {/* =================================================

            DESKTOP / TABLET STEPPER

        ================================================== */}

        <div className="mt-9 hidden overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/96 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:block">

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

                  className={`relative px-5 py-4 text-left transition md:px-6 ${active

                    ? "bg-white/[0.035]"

                    : "hover:bg-white/[0.018]"

                    }`}

                >

                  <div className="flex items-center gap-3">

                    <span

                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition ${active || completed

                        ? "bg-orange-500 text-black"

                        : "border border-white/[0.12] text-white/[0.74]"

                        }`}

                    >

                      {completed

                        ? "✓"

                        : index + 1}

                    </span>

                    <div>

                      <p

                        className={`text-[14px] font-medium ${active

                          ? "text-white"

                          : completed

                            ? "text-white/[0.92]"

                            : "text-white/[0.74]"

                          }`}

                      >

                        {label}

                      </p>

                      <p className="mt-0.5 hidden text-[11px] text-white/[0.58] lg:block">

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

        {/* =================================================

            FORM + SUMMARY

        ================================================== */}

        <div className="mt-5 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* FORM */}

          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/96 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-6 sm:shadow-[0_14px_34px_rgba(0,0,0,0.30)] lg:p-8">

            {step === 0 && (

              <ContactStep

                form={form}

                update={update}

              />

            )}

            {step === 1 && (

              <PackageStep

                form={form}

                update={update}

              />

            )}

            {step === 2 && (

              <RouteStep

                form={form}

                update={update}

                hubs={hubs}

                loading={hubsLoading}

              />

            )}

            {step === 3 && (

              <ScheduleStep

                form={form}

                update={update}

              />

            )}

            {error && (

              <div

                className="mt-5 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] leading-5 text-red-300 sm:mt-7 sm:text-[13px] sm:leading-6"

                role="alert"

              >

                {error}

              </div>

            )}

            {/* MOBILE NAVIGATION */}

            <div className="mt-7 grid grid-cols-[auto_1fr] gap-3 border-t border-white/[0.08] pt-5 sm:hidden">

              {step > 0 ? (

                <button

                  type="button"

                  onClick={back}

                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.10] px-4 text-[13px] font-medium text-white/[0.78] transition active:bg-white/[0.04]"

                >

                  <ArrowLeft size={16} />

                  Back

                </button>

              ) : (

                <div />

              )}

              <button

                type="button"

                onClick={next}

                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black transition active:bg-orange-400"

              >

                {step === steps.length - 1

                  ? "Review delivery"

                  : "Continue"}

                <ArrowRight

                  size={16}

                  className="transition-transform group-hover:translate-x-0.5"

                />

              </button>

            </div>

            {/* DESKTOP NAVIGATION */}

            <div className="mt-10 hidden items-center justify-between border-t border-white/[0.08] pt-6 sm:flex">

              <button

                type="button"

                disabled={step === 0}

                onClick={back}

                className="inline-flex h-12 items-center gap-2 rounded-lg px-5 text-[14px] font-medium text-white/[0.84] transition hover:bg-white/[0.04] hover:text-white disabled:pointer-events-none disabled:opacity-0"

              >

                <ArrowLeft size={16} />

                Back

              </button>

              <button

                type="button"

                onClick={next}

                className="group inline-flex h-12 items-center gap-3 rounded-lg bg-orange-500 px-7 text-[14px] font-semibold text-black transition hover:bg-orange-400"

              >

                {step === steps.length - 1

                  ? "Review delivery"

                  : "Continue"}

                <ArrowRight

                  size={16}

                  className="transition-transform group-hover:translate-x-0.5"

                />

              </button>

            </div>

          </section>

          {/* SUMMARY */}

          <aside className="h-fit rounded-2xl border border-white/[0.10] bg-[#161217]/96 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-6 sm:shadow-[0_14px_34px_rgba(0,0,0,0.30)] lg:sticky lg:top-[96px]">

            <div className="flex items-center justify-between">

              <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-white/[0.82] sm:text-[14px] sm:text-white">

                Delivery summary

              </p>

              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-white/[0.62] sm:px-3 sm:py-1.5 sm:text-[11px] sm:text-white">

                Draft

              </span>

            </div>

            <div className="mt-3 sm:mt-5">

              <SummaryItem

                label="Weight"

                value={

                  form.weightKg === ""

                    ? "—"

                    : `${form.weightKg} kg`

                }

              />

              <SummaryItem

                label="Package size"

                value={

                  form.packageSize || "—"

                }

              />

              <SummaryItem

                label="Delivery mode"

                value={

                  !form.deliveryMode

                    ? "—"

                    : form.deliveryMode ===

                      "express"

                      ? "Express"

                      : "Scheduled"

                }

              />

              {preview && (

                <>

                  <SummaryItem

                    label="Drop-off Point"

                    value={preview.originHub.name}

                  />

                  <SummaryItem

                    label="Pick-up Point"

                    value={

                      preview.destinationHub.name

                    }

                  />

                </>

              )}

            </div>

            {/* LIVE PRICE */}

            <div className="mt-4 rounded-xl border border-white/[0.09] bg-[#19151a] p-4 sm:mt-6 sm:p-5">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/[0.42]">

                    Estimated price

                  </p>

                  <p className="mt-1.5 text-[12px] leading-5 text-white/[0.48]">

                    Updates automatically when category, weight, size, route, insurance or delivery mode changes.

                  </p>

                </div>

                <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/[0.55]">

                  {estimateLoading

                    ? "Calculating…"

                    : preview

                      ? "Estimate"

                      : "Waiting"}

                </span>

              </div>

              {pricingReady && preview ? (

                <div className="mt-4 border-t border-white/[0.07] pt-4">

                  <CreatePriceBreakdown

                    price={preview.price}

                  />

                </div>

              ) : (

                <div className="mt-4 border-t border-white/[0.07] pt-4">

                  <p className="text-[11px] leading-5 text-white/[0.34] sm:text-[12px]">

                    {estimateLoading

                      ? "Calculating delivery estimate…"

                      : estimateError ||

                      "Select package details, hubs and delivery mode to calculate the price."}

                  </p>

                </div>

              )}

              <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/[0.08] pt-4">

                <div>

                  <p className="text-[12px] font-semibold text-white/[0.72]">

                    Estimated total

                  </p>

                  {!pricingReady && (

                    <p className="mt-1 text-[10px] text-white/[0.34]">

                      Complete the required selections to calculate the final estimate.

                    </p>

                  )}

                </div>

                <p className="text-right text-[22px] font-semibold tracking-[-0.03em] text-white">

                  {preview

                    ? formatVnd(preview.price.total)

                    : "—"}

                </p>

              </div>

            </div>

            <div className="mt-4 rounded-xl border border-orange-500/[0.16] bg-orange-500/[0.05] p-4 sm:mt-6 sm:p-5">

              <p className="text-[12px] font-semibold text-orange-400 sm:text-[14px]">

                3-hour handover requirement

              </p>

              <p className="mt-2 text-[11px] font-medium leading-5 text-white/[0.62] sm:mt-3 sm:text-[13px] sm:leading-6 sm:text-white/[0.80]">

                Bring your package to the selected

                Drop-off Point within 3 hours after placing

                the order.

              </p>

            </div>

          </aside>

        </div>

      </div>

    </div>

  );

}

/* =========================================================

   STEP PROPS

========================================================= */

interface StepProps {

  form: DeliveryDraftWithPricing;

  update: <

    K extends keyof DeliveryDraftWithPricing,

  >(

    key: K,

    value: DeliveryDraftWithPricing[K],

  ) => void;

}

/* =========================================================

   CONTACT STEP

========================================================= */

function ContactStep({

  form,

  update,

}: StepProps) {

  return (

    <section>

      <SectionTitle

        title="Sender and recipient"

        description="Confirm the sender information and enter the details of the person receiving the package."

      />

      <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-6 xl:grid-cols-2">

        <ContactGroup

          title="Sender"

          description="Your registered account information."

        >

          <Field

            label="Full name"

            value={form.senderName}

            readOnly

          />

          <Field

            label="Phone number"

            value={form.senderPhone}

            placeholder="090 123 4567"

            inputMode="tel"

            onChange={(value) =>

              update("senderPhone", value)

            }

          />

        </ContactGroup>

        <ContactGroup

          title="Recipient"

          description="The person collecting the package will receive delivery updates at this email."

        >

          <Field

            label="Full name"

            value={form.recipientName}

            placeholder="Recipient name"

            onChange={(value) =>

              update("recipientName", value)

            }

          />

          <Field

            label="Email address"

            value={form.recipientEmail}

            placeholder="recipient@example.com"

            inputMode="email"

            type="email"

            onChange={(value) =>

              update("recipientEmail", value)

            }

          />

        </ContactGroup>

      </div>

    </section>

  );

}

/* =========================================================

   PACKAGE STEP

========================================================= */

function PackageStep({

  form,

  update,

}: StepProps) {

  const fragileSelected =

    form.packageCategory === "fragile";

  return (

    <section>

      <SectionTitle

        title="Package information"

        description="Provide the package category, weight and physical size so the system can validate aircraft capacity."

      />

      <div className="mt-5 sm:mt-8">

        <label className="block">

          <FieldLabel>

            Package category

          </FieldLabel>

          <select

            value={form.packageCategory}

            onChange={(event) =>

              update(

                "packageCategory",

                event.target

                  .value as DeliveryDraft["packageCategory"],

              )

            }

            className="mt-2 h-[50px] w-full rounded-lg border border-white/[0.1] bg-[#19151a] px-3 text-[14px] text-white outline-none transition hover:border-white/[0.17] focus:border-orange-500 sm:mt-2.5 sm:h-[54px] sm:px-4 sm:text-[15px]"

          >

            <option

              value=""

              disabled

            >

              Select package category

            </option>

            {PACKAGE_CATEGORIES.map(

              (item) => (

                <option

                  key={item.value}

                  value={item.value}

                >

                  {item.label}

                </option>

              ),

            )}

          </select>

          {fragileSelected && (

            <p className="mt-2 text-[11px] leading-5 text-orange-400/90 sm:text-[12px]">

              Fragile handling will be included automatically in the backend estimate and shown in the price breakdown.

            </p>

          )}

        </label>

        {form.packageCategory ===

          "other" && (

            <div className="mt-5 sm:mt-6">

              <Field

                label="Package description"

                value={

                  form.packageDescription

                }

                placeholder="Describe the package contents"

                onChange={(value) =>

                  update(

                    "packageDescription",

                    value,

                  )

                }

              />

            </div>

          )}

        <div className="mt-6 sm:mt-7">

          <FieldLabel>

            Package weight

          </FieldLabel>

          <div className="mt-2 flex h-[50px] overflow-hidden rounded-lg border border-white/[0.1] bg-[#19151a] transition hover:border-white/[0.17] focus-within:border-orange-500 sm:mt-2.5 sm:h-[54px]">

            <input

              type="number"

              min="0.1"

              max="10"

              step="0.1"

              value={form.weightKg}

              onChange={(event) =>

                update(

                  "weightKg",

                  event.target.value === ""

                    ? ""

                    : Number(

                      event.target.value,

                    ),

                )

              }

              className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-white outline-none sm:px-4 sm:text-[15px]"

            />

            <div className="flex items-center border-l border-white/[0.08] px-3 text-[12px] text-white/[0.72] sm:px-4 sm:text-[13px] sm:text-white">

              kg

            </div>

          </div>

          <div className="mt-2 flex items-center justify-between gap-3">

            <p className="text-[10px] text-white/[0.48] sm:text-[11px] sm:text-white/[0.72]">

              Maximum supported payload

            </p>

            <p

              className={`text-[10px] font-medium sm:text-[11px] ${form.weightKg !== "" &&

                form.weightKg > 10

                ? "text-red-400"

                : "text-white/[0.72] sm:text-white"

                }`}

            >

              {form.weightKg === ""

                ? "—"

                : form.weightKg}{" "}

              / {"≤ 10 kg"}

            </p>

          </div>

        </div>

        <div className="mt-6 sm:mt-8">

          <FieldLabel>

            Package size

          </FieldLabel>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">

            {(

              Object.keys(

                PACKAGE_SIZE_RULES,

              ) as PackageSize[]

            ).map((size) => {

              const active =

                form.packageSize === size;

              return (

                <button

                  key={size}

                  type="button"

                  onClick={() =>

                    update(

                      "packageSize",

                      size,

                    )

                  }

                  className={`min-h-[92px] rounded-xl border p-3 text-left transition sm:min-h-0 sm:rounded-lg sm:p-4 ${active

                    ? "border-orange-500 bg-orange-500/[0.055]"

                    : "border-white/[0.08] bg-[#19151a] hover:border-white/[0.18]"

                    }`}

                >

                  <div className="flex items-center justify-between">

                    <p

                      className={`text-[18px] font-semibold sm:text-[20px] ${active

                        ? "text-orange-400"

                        : "text-white"

                        }`}

                    >

                      {size}

                    </p>

                    <span

                      className={`h-2 w-2 rounded-full ${active

                        ? "bg-orange-500"

                        : "bg-white/10"

                        }`}

                    />

                  </div>

                  <p className="mt-2 text-[10px] leading-4 text-white/[0.54] sm:mt-3 sm:text-[11px] sm:leading-5 sm:text-white/[0.74]">

                    {

                      PACKAGE_SIZE_RULES[

                        size

                      ].dimensions

                    }

                  </p>

                </button>

              );

            })}

          </div>

          <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#19151a] p-4 sm:mt-5 sm:rounded-lg sm:p-5">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-[10px] text-white/[0.46] sm:text-[11px] sm:text-white/[0.74]">

                  Selected size

                </p>

                <p className="mt-1 text-[13px] font-medium text-white sm:text-[14px]">

                  {form.packageSize

                    ? `Size ${form.packageSize}`

                    : "Not selected"}

                </p>

              </div>

              <div className="max-w-[58%] text-right">

                <p className="text-[10px] text-white/[0.46] sm:text-[11px] sm:text-white/[0.74]">

                  Maximum dimensions

                </p>

                <p className="mt-1 text-[11px] leading-5 text-white/[0.82] sm:text-[13px] sm:text-white/[0.92]">

                  {

                    form.packageSize

                      ? PACKAGE_SIZE_RULES[

                        form.packageSize

                      ].dimensions

                      : "—"

                  }

                </p>

              </div>

            </div>

            <p className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] leading-5 text-white/[0.52] sm:mt-4 sm:pt-4 sm:text-[11px] sm:text-white/[0.74]">

              {

                form.packageSize

                  ? PACKAGE_SIZE_RULES[

                    form.packageSize

                  ].description

                  : "Select a package size to view its limits."

              }

            </p>

            <p className="mt-3 text-[10px] leading-5 text-white/[0.40] sm:text-[11px]">

              The backend estimate is the source of truth for the final delivery quotation.

            </p>

          </div>

          {/* PACKAGE INSURANCE */}

          <label

            className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition sm:mt-5 sm:p-5 ${form.hasInsurance

              ? "border-orange-500/[0.45] bg-orange-500/[0.05]"

              : "border-white/[0.09] bg-[#19151a] hover:border-white/[0.16]"

              }`}

          >

            <input

              type="checkbox"

              checked={Boolean(

                form.hasInsurance,

              )}

              onChange={(event) =>

                update(

                  "hasInsurance",

                  event.target.checked,

                )

              }

              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"

            />

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <p className="text-[13px] font-semibold text-white sm:text-[14px]">

                  Package insurance

                </p>

                <span className="rounded-full bg-orange-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-orange-400">

                  +10%

                </span>

              </div>

              <p className="mt-1.5 text-[11px] leading-5 text-white/[0.48] sm:text-[12px]">

                Optional package protection. Insurance is calculated by Backend as 10% of the core fee.

              </p>

              <p className="mt-1 text-[10px] leading-5 text-white/[0.34] sm:text-[11px]">

                Turning this option on or off automatically requests a new backend estimate, so the displayed total always follows the latest quotation.

              </p>

            </div>

          </label>

        </div>

      </div>

    </section>

  );

}

/* =========================================================

   ROUTE STEP

========================================================= */

function RouteStep({

  form,

  update,

  hubs,

  loading,

}: StepProps & {

  hubs: DeliveryHub[];

  loading: boolean;

}) {

  const originHub =

    hubs.find(

      (hub) =>

        String(hub.id) ===

        form.originArea,

    ) ?? null;

  const destinationHub =

    hubs.find(

      (hub) =>

        String(hub.id) ===

        form.destinationArea,

    ) ?? null;

  return (

    <section>

      <SectionTitle

        title="Delivery route"

        description="Choose the origin and Pick-up Points loaded from the DroneOptAI backend."

      />

      <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2">

        <HubSelect

          label="Sending hub"

          value={form.originArea}

          hubs={hubs}

          loading={loading}

          onChange={(value) =>

            update("originArea", value)

          }

        />

        <HubSelect

          label="Receiving hub"

          value={form.destinationArea}

          hubs={hubs}

          loading={loading}

          onChange={(value) =>

            update(

              "destinationArea",

              value,

            )

          }

        />

      </div>

      {originHub && destinationHub && (

        <div className="mt-6 sm:mt-8">

          <div className="flex items-center gap-3">

            <span className="h-2 w-2 rounded-full bg-orange-500" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-orange-400 sm:text-[11px]">

              Selected route

            </p>

          </div>

          <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 md:grid-cols-[1fr_46px_1fr] md:items-center">

            <HubBlock

              label="Drop-off Point"

              name={originHub.name}

              address={originHub.address}

            />

            <div className="hidden items-center justify-center md:flex">

              <ArrowRight size={18} className="text-white/[0.58]" />

            </div>

            <div className="flex items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/[0.28] md:hidden">

              <span className="h-px flex-1 bg-white/[0.08]" />

              <ArrowRight size={13} />

              <span className="h-px flex-1 bg-white/[0.08]" />

            </div>

            <HubBlock

              label="Pick-up Point"

              name={destinationHub.name}

              address={destinationHub.address}

            />

          </div>

        </div>

      )}

    </section>

  );

}

function HubSelect({

  label,

  value,

  hubs,

  loading,

  onChange,

}: {

  label: string;

  value: string;

  hubs: DeliveryHub[];

  loading: boolean;

  onChange: (value: string) => void;

}) {

  return (

    <label className="block">

      <FieldLabel>{label}</FieldLabel>

      <select

        value={value}

        disabled={loading}

        onChange={(event) =>

          onChange(event.target.value)

        }

        className="mt-2 h-[50px] w-full rounded-lg border border-white/[0.1] bg-[#19151a] px-3 text-[14px] text-white outline-none transition hover:border-white/[0.17] focus:border-orange-500 disabled:opacity-60 sm:mt-2.5 sm:h-[54px] sm:px-4 sm:text-[15px]"

      >

        <option value="">

          {loading

            ? "Loading hubs…"

            : "Select hub"}

        </option>

        {hubs.map((hub) => (

          <option

            key={String(hub.id)}

            value={String(hub.id)}

          >

            {hub.name} — {hub.address}

          </option>

        ))}

      </select>

    </label>

  );

}

/* =========================================================

   SCHEDULE STEP

========================================================= */

function ScheduleStep({

  form,

  update,

}: StepProps) {

  const minimumSchedule =

    getMinimumScheduleValue();

  return (

    <section>

      <SectionTitle

        title="Delivery time"

        description="Choose Express for the earliest available delivery or schedule a preferred departure time."

      />

      <div className="mt-5 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">

        <ModeButton

          active={

            form.deliveryMode === "express"

          }

          title="Express"

          description="Earliest available flight after handover. Express adds 25% of Core Fee."

          onClick={() =>

            update(

              "deliveryMode",

              "express",

            )

          }

        />

        <ModeButton

          active={

            form.deliveryMode ===

            "scheduled"

          }

          title="Scheduled"

          description="Choose a preferred departure time at least 3 hours from now. No service surcharge."

          onClick={() =>

            update(

              "deliveryMode",

              "scheduled",

            )

          }

        />

      </div>

      {form.deliveryMode ===

        "scheduled" && (

          <div className="mt-5 max-w-[460px] sm:mt-7">

            <FieldLabel>

              Preferred departure

            </FieldLabel>

            <input

              type="datetime-local"

              min={minimumSchedule}

              value={

                form.requestedDepartureAt

              }

              onChange={(event) =>

                update(

                  "requestedDepartureAt",

                  event.target.value,

                )

              }

              className="mt-2 h-[50px] w-full rounded-lg border border-white/[0.1] bg-[#19151a] px-3 text-[14px] text-white outline-none transition hover:border-white/[0.17] focus:border-orange-500 sm:mt-2.5 sm:h-[54px] sm:px-4 sm:text-[15px]"

            />

            <p className="mt-2 text-[10px] leading-5 text-white/[0.48] sm:text-[11px] sm:text-white/[0.72]">

              Scheduled departure must be at

              least 3 hours from the current

              time.

            </p>

          </div>

        )}

      <div className="mt-6 rounded-xl border border-orange-500/[0.14] bg-orange-500/[0.045] p-4 sm:mt-8 sm:rounded-lg sm:p-5">

        <div className="flex gap-3 sm:gap-4">

          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-black sm:mt-1 sm:h-7 sm:w-7 sm:text-[11px]">

            !

          </div>

          <div>

            <p className="text-[13px] font-semibold text-white sm:text-[14px]">

              Package handover policy

            </p>

            <p className="mt-1.5 max-w-[650px] text-[11px] font-medium leading-5 text-white/[0.62] sm:mt-2 sm:text-[13px] sm:leading-6 sm:text-white/[0.80]">

              After placing the order, the

              package must be delivered to

              the assigned Drop-off Point within

              3 hours. If the package arrives

              after the deadline, the

              requested delivery time may be

              moved to the next available

              flight slot.

            </p>

          </div>

        </div>

      </div>

    </section>

  );

}

/* =========================================================

   SECTION TITLE

========================================================= */

function SectionTitle({

  title,

  description,

}: {

  title: string;

  description: string;

}) {

  return (

    <div className="border-b border-white/[0.08] pb-4 sm:pb-6">

      <h2 className="text-[21px] font-bold tracking-[-0.025em] text-white sm:text-[26px]">

        {title}

      </h2>

      <p className="mt-2 max-w-[680px] text-[12px] font-medium leading-5 text-white/[0.50] sm:mt-3 sm:text-[15px] sm:leading-7 sm:text-white/[0.82]">

        {description}

      </p>

    </div>

  );

}

/* =========================================================

   CONTACT GROUP

========================================================= */

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

    <div className="rounded-xl border border-white/[0.10] bg-[#19151a] p-4 shadow-[0_6px_18px_rgba(0,0,0,0.14)] sm:rounded-2xl sm:p-6 sm:shadow-[0_8px_22px_rgba(0,0,0,0.18)]">

      <div className="border-b border-white/[0.07] pb-4 sm:pb-5">

        <p className="text-[15px] font-bold text-white sm:text-[17px]">

          {title}

        </p>

        <p className="mt-1.5 text-[11px] font-medium leading-5 text-white/[0.50] sm:mt-2 sm:text-[13px] sm:text-white/[0.80]">

          {description}

        </p>

      </div>

      <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">

        {children}

      </div>

    </div>

  );

}

/* =========================================================

   FIELD LABEL

========================================================= */

function FieldLabel({

  children,

}: {

  children: ReactNode;

}) {

  return (

    <span className="text-[12px] font-semibold text-white/[0.82] sm:text-[14px] sm:text-white">

      {children}

    </span>

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

/* =========================================================

   FIELD

========================================================= */

function Field({

  label,

  value,

  placeholder,

  onChange,

  readOnly,

  inputMode,

  type = "text",

}: {

  label: string;

  value: string;

  placeholder?: string;

  onChange?: (value: string) => void;

  readOnly?: boolean;

  inputMode?: FieldInputMode;

  type?: "text" | "email" | "tel";

}) {

  return (

    <label className="block">

      <FieldLabel>{label}</FieldLabel>

      <input

        type={type}

        value={value}

        readOnly={readOnly}

        inputMode={inputMode}

        placeholder={placeholder}

        onChange={(event) =>

          onChange?.(event.target.value)

        }

        className={`mt-2 h-[50px] w-full rounded-lg border px-3 text-[14px] outline-none transition sm:mt-2.5 sm:h-[54px] sm:px-4 sm:text-[15px] ${readOnly

          ? "cursor-not-allowed border-white/[0.07] bg-white/[0.025] text-white/[0.68] sm:text-white/[0.84]"

          : "border-white/[0.1] bg-[#1d181d] text-white placeholder:text-white/[0.30] hover:border-white/[0.17] focus:border-orange-500 sm:placeholder:text-white/[0.42]"

          }`}

      />

    </label>

  );

}

/* =========================================================

   LOCATION FIELD

========================================================= */

/* =========================================================

   HUB BLOCK

========================================================= */

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

    <div className="rounded-xl border border-white/[0.07] bg-[#1d181d] p-4 sm:rounded-lg sm:p-5">

      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/[0.46] sm:text-[10px] sm:text-white/[0.72]">

        {label}

      </p>

      <p className="mt-2 text-[14px] font-bold text-white sm:text-[16px]">

        {name}

      </p>

      <p className="mt-1.5 text-[10px] leading-5 text-white/[0.48] sm:mt-2 sm:text-[11px] sm:text-white/[0.74]">

        {address}

      </p>

    </div>

  );

}

/* =========================================================

   MODE BUTTON

========================================================= */

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

      className={`rounded-xl border p-4 text-left transition sm:rounded-lg sm:p-5 ${active

        ? "border-orange-500 bg-orange-500/[0.05]"

        : "border-white/[0.09] bg-[#19151a] hover:border-white/[0.18]"

        }`}

    >

      <div className="flex items-center justify-between gap-4">

        <p className="text-[14px] font-bold text-white sm:text-[16px]">

          {title}

        </p>

        <span

          className={`h-2.5 w-2.5 rounded-full border ${active

            ? "border-orange-500 bg-orange-500"

            : "border-white/[0.20] bg-transparent"

            }`}

        />

      </div>

      <p className="mt-1.5 text-[11px] font-medium leading-5 text-white/[0.52] sm:mt-2 sm:text-[13px] sm:leading-6 sm:text-white/[0.80]">

        {description}

      </p>

    </button>

  );

}

/* =========================================================

   SUMMARY ITEM

========================================================= */

function SummaryItem({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] py-3.5 last:border-b-0 sm:gap-6 sm:py-5">

      <span className="text-[11px] text-white/[0.36] sm:text-[13px] sm:text-white/[0.4]">

        {label}

      </span>

      <span className="max-w-[60%] text-right text-[13px] font-semibold leading-5 text-white/[0.76] sm:max-w-[180px] sm:text-[17px] sm:font-bold sm:text-white/[0.8]">

        {value}

      </span>

    </div>

  );

}

/* =========================================================

   PRICE LINE

========================================================= */

function CreatePriceBreakdown({

  price,

}: {

  price: DeliveryPrice;

}) {

  const details =

    price.feeDetails;

  if (!details) {

    return (

      <div className="space-y-3">

        <PriceLine

          label="Delivery fee"

          value={formatVnd(

            price.deliveryFee,

          )}

        />

        <PriceLine

          label="Service fee"

          value={formatVnd(

            price.serviceFee,

          )}

        />

      </div>

    );

  }

  const coreFee =

    details.baseFee +

    details.distanceFee +

    details.payloadFee;

  const hasSeparateServiceFee =

    price.serviceFee > 0 &&

    Math.abs(

      price.serviceFee -

      details.expressSurcharge,

    ) > 0.5;

  return (

    <div className="space-y-3">

      <PriceLine

        label="Base fee"

        value={formatVnd(

          details.baseFee,

        )}

      />

      <PriceLine

        label="Distance fee"

        value={formatVnd(

          details.distanceFee,

        )}

      />

      <PriceLine

        label="Payload fee"

        value={formatVnd(

          details.payloadFee,

        )}

      />

      <div className="border-t border-white/[0.07] pt-3">

        <PriceLine

          label="Core fee"

          value={formatVnd(

            coreFee,

          )}

          strong

        />

      </div>

      {details.fragileSurcharge > 0 && (

        <PriceLine

          label="Fragile surcharge"

          value={`+${formatVnd(

            details.fragileSurcharge,

          )}`}

        />

      )}

      {details.insuranceFee > 0 && (

        <PriceLine

          label="Package insurance"

          value={`+${formatVnd(

            details.insuranceFee,

          )}`}

        />

      )}

      <div className="border-t border-white/[0.07] pt-3">

        <PriceLine

          label="Delivery subtotal"

          value={formatVnd(

            price.deliveryFee,

          )}

          strong

        />

      </div>

      {details.expressSurcharge > 0 && (

        <PriceLine

          label="Express surcharge"

          value={`+${formatVnd(

            details.expressSurcharge,

          )}`}

        />

      )}

      {hasSeparateServiceFee && (

        <PriceLine

          label="Service fee"

          value={formatVnd(

            price.serviceFee,

          )}

        />

      )}

    </div>

  );

}

function PriceLine({

  label,

  value,

  muted = false,

  strong = false,

}: {

  label: string;

  value: string;

  muted?: boolean;

  strong?: boolean;

}) {

  return (

    <div className="flex items-start justify-between gap-4">

      <span

        className={`text-[11px] leading-5 sm:text-[12px] ${strong

          ? "font-semibold text-white/[0.68]"

          : "text-white/[0.42]"

          }`}

      >

        {label}

      </span>

      <span

        className={`text-right text-[12px] leading-5 ${strong

          ? "font-semibold text-white"

          : muted

            ? "font-medium text-white/[0.30]"

            : "font-medium text-white/[0.78]"

          }`}

      >

        {value}

      </span>

    </div>

  );

}

/* =========================================================

   STEP CAPTION

========================================================= */

function getStepCaption(index: number) {

  switch (index) {

    case 0:

      return "Sender & recipient";

    case 1:

      return "Package details";

    case 2:

      return "Delivery route";

    case 3:

      return "Delivery time";

    default:

      return "";

  }

}
