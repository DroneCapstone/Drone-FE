import {
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import deliveryHandoverImage from "../../../assets/images/customer/help-delivery-handover.png";
import packageRulesImage from "../../../assets/images/customer/help-package-rules.png";
import pricingPaymentImage from "../../../assets/images/customer/help-pricing-payment.png";
import insurancePoliciesImage from "../../../assets/images/customer/help-insurance-policies.png";

type HelpCategory =
  | "delivery"
  | "package"
  | "payment"
  | "policy";

type HelpArticle = {
  id: string;
  category: HelpCategory;
  title: string;
  summary: string;
  content: string;
};

type CategoryCard = {
  id: HelpCategory;
  title: string;
  description: string;
  image: string;
};

const CATEGORIES: CategoryCard[] = [
  {
    id: "delivery",
    title: "Delivery & handover",
    description:
      "Hub delivery, deadlines and delivery modes.",
    image: deliveryHandoverImage,
  },
  {
    id: "package",
    title: "Package rules",
    description:
      "Package size, weight and fragile items.",
    image: packageRulesImage,
  },
  {
    id: "payment",
    title: "Pricing & payment",
    description:
      "Quotation, checkout and payment status.",
    image: pricingPaymentImage,
  },
  {
    id: "policy",
    title: "Insurance & policies",
    description:
      "Insurance, refunds, compensation and cancellation.",
    image: insurancePoliciesImage,
  },
];

const ARTICLES: HelpArticle[] = [
  {
    id: "hub-to-hub",
    category: "delivery",
    title: "How hub-to-hub delivery works",
    summary:
      "Where the sender drops off and the recipient collects the package.",
    content:
      "DroneOptAI deliveries operate between selected hubs. The sender brings the package to the Drop-off Point, and the recipient collects it at the Pick-up Point.",
  },
  {
    id: "handover-deadline",
    category: "delivery",
    title: "Handover deadline",
    summary:
      "When your package must reach the Drop-off Point.",
    content:
      "Bring the package to the selected Drop-off Point before the handover deadline shown in your order. Late handover may move the delivery to a later available slot.",
  },
  {
    id: "delivery-modes",
    category: "delivery",
    title: "Normal, Express and Scheduled delivery",
    summary:
      "Choose the service that fits the urgency of your shipment.",
    content:
       "Normal delivery is a standard service without a delivery-mode surcharge; the backend schedules it using available capacity. Express prioritizes time-sensitive shipments and currently adds a 25% surcharge based on the core fee. Scheduled lets customers request a departure time in advance without a delivery-mode surcharge.",
  },
  {
    id: "package-limits",
    category: "package",
    title: "Package size and weight limits",
    summary:
      "Choose a tier that fits both dimensions and payload.",
    content:
      "The customer flow supports package tiers from S to XL. The maximum supported payload is 10 kg. Choose the smallest package tier that safely fits both the package dimensions and weight.",
  },
  {
    id: "fragile-items",
    category: "package",
    title: "Fragile packages",
    summary:
      "Extra handling for fragile package types.",
    content:
      "Select the fragile package category when applicable. The current pricing rule adds a fragile surcharge of 15% of the core fee.",
  },
  {
    id: "quotation",
    category: "payment",
    title: "How the delivery price is calculated",
    summary:
      "The backend returns the final quotation before payment.",
    content:
      "Core fee is calculated from base fee, distance fee and payload fee. Optional surcharges are then applied when relevant, such as fragile handling, insurance or Express delivery.",
  },
  {
    id: "payment-status",
    category: "payment",
    title: "Payment and payment status",
    summary:
      "Complete checkout before package handover continues.",
    content:
      "The final quotation is shown before payment. Complete checkout to confirm payment, then follow the payment and order status from My deliveries.",
  },
  {
    id: "insurance",
    category: "policy",
    title: "Package insurance",
    summary:
      "Optional protection for eligible packages.",
    content:
      "Package insurance is optional and adds 10% of the core fee. Insurance compensation for lost or damaged goods is assessed separately under the applicable coverage terms; the 10% premium is not a guaranteed payout rate.",
  },
  {
    id: "changes-cancellation",
    category: "policy",
    title: "Order changes and cancellation",
    summary:
      "Availability depends on the current order stage.",
    content:
      "An unpaid PENDING order with no mission can be deleted in Order Details. Paid orders cannot be deleted using this feature; for paid-order cancellation or refund review, contact Customer Support. Eligibility depends on the order stage and backend rules.",
  },

  {
    id: "refund-rules",
    category: "policy",
    title: "Refund conditions & compensation",
    summary: "Who qualifies, what fees are covered, and what happens when parcels are lost or damaged.",
    // Includes searchable terms for the former detailed policy articles.
    content: `Policy. Refund eligibility is verified against confirmed payment, order history, hub handovers, mission records and liability. Eligible delivery-related charges include paid core fee and applicable handling/Express surcharges. Insurance premiums and compensation for the value of goods are assessed separately. No double refunds for the same fee. Estimated arrival (ETA) is not a guaranteed deadline; delay refunds need a confirmed delivery deadline. Applicable law and consumer rights prevail.

    Full refund 100%: service cancelled or permanently impossible due to DroneOptAI issues, drone battery hub failures, parcel lost after origin-hub acceptance, or severe weather disruption when no rescheduling is accepted and the paid service cannot be provided. Duplicate payment returns 100% of duplicate amount; incorrect overcharge returns 100% of excess amount only.

    Late delivery after a confirmed deadline caused by DroneOptAI: under 60 minutes 0%; from 60 to 120 minutes 20%; above 120 minutes 50%. Express priority failure refunds 100% of Express surcharge paid (Express surcharge is currently 25% of core fee); Express does not guarantee immediate flight or a fixed ETA.

    Parcel lost: 100% of eligible delivery charges; minor damage but usable: 50%; severe damage making goods unusable: 100%. Actual value compensation is reviewed separately based on evidence, liability, packaging and insurance cover. Insurance fee is 10% of core fee but is not the payout rate.

    Weather and rescheduling: safety first. New schedule accepted and completed: no automatic refund. If service becomes impossible with no accepted alternative: proposed 100%, reviewed case by case. Weather-only delay is not automatically eligible for 20% or 50%.

    Customer-caused delays, missed drop-off, invalid package, incorrect information and failure to collect after fulfilled hub-to-hub delivery: proposed 0% where exclusively due to Customer, subject to law. Unpaid PENDING orders can have no payment refund. Deleting an eligible unpaid pending order is not a refund. Paid orders cannot use the current DELETE order API.`,
  },
  {
    id: "refund-claims",
    category: "policy",
    title: "How to request a refund",
    summary: "What to prepare, how claims are reviewed, and expected processing times.",
    content: `Contact DroneOptAI Customer Support with order ID, payment reference, description and evidence; for parcel loss or damage include photos and handover records. Report promptly, preferably within 7 calendar days; later reports may still be considered. Customer Support verifies payment, hub events, mission, deadline, incident, liability and insurance, then decides eligible fee base, percentage and amount. A first response within 3 business days is a proposed target. Approved refunds may take 5–15 business days depending on the bank and provider; not guaranteed. Rejected claims can be reconsidered with new evidence. Help & Policies does not submit a claim or transfer refunds automatically.`,
  },
];


/** One clear reference table instead of nine separate refund articles. */
type RefundRow = {
  situation: string;
  detail: string;
  rate: string;
};

const REFUND_ROWS: RefundRow[] = [
  { situation: "Service cancelled or parcel lost", detail: "DroneOptAI responsibility confirmed", rate: "100%" },
  { situation: "Late by 60–120 minutes", detail: "Verified operational fault and confirmed deadline", rate: "20%" },
  { situation: "Late by over 120 minutes", detail: "Verified operational fault and confirmed deadline", rate: "50%" },
  { situation: "Express priority not provided", detail: "Express surcharge only", rate: "100% surcharge" },
  { situation: "Parcel damaged during transport", detail: "Minor 50% · Severe 100%", rate: "50–100%" },
  { situation: "Customer-caused issue", detail: "Only where the agreed service was fulfilled", rate: "0%" },
];

function RefundQuickGuide() {
  return (
    <section className="mb-4 overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#151217]/92" aria-label="Refund rates summary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.09] px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-[10px] font-semibold capitalize tracking-normal text-orange-300">Refund guide</p>
          <h3 className="mt-1 text-[17px] font-semibold text-white">Refunds at a glance</h3>
        </div>
        
      </div>
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.025]">
            <th scope="col" className="w-[68%] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/[0.55] sm:px-5">Situation</th>
            <th scope="col" className="w-[32%] px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white/[0.55] sm:px-5">Refund</th>
          </tr>
        </thead>
        <tbody>
          {REFUND_ROWS.map(({ situation, detail, rate }) => (
            <tr key={situation} className="border-b border-white/[0.07] last:border-0">
              <td className="px-4 py-3 align-middle sm:px-5">
                <p className="text-[12px] font-semibold leading-5 text-white/[0.90] sm:text-[13px]">{situation}</p>
                <p className="mt-0.5 text-[11px] leading-[1.5] text-white/[0.58]">{detail}</p>
              </td>
              <td className="px-3 py-3 text-right align-middle sm:px-5">
                <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold leading-4 ${rate === "0%" ? "bg-white/[0.05] text-white/[0.62]" : "bg-orange-500/[0.10] text-orange-300"}`}>
                  {rate}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-white/[0.08] px-4 py-3 text-[11px] leading-[1.6] text-white/[0.62] sm:px-5">
        Proposed rates on eligible <strong className="font-semibold text-white/[0.84]">paid delivery fees</strong>, not the value of goods. Claims require verification; they are not automatic refunds.
      </p>
    </section>
  );
}

function PolicySubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="border-l-[3px] border-orange-500 pl-3 text-[13px] font-semibold text-white">{title}</h4>
      <div className="pl-3 text-[12px] leading-[1.7] text-white/[0.78]">{children}</div>
    </section>
  );
}

function RefundRules() {
  return (
    <div className="space-y-4">
      <PolicySubsection title="When a refund applies">
        <p>Payment and the reason for the issue must be verified using the order, hub handovers and mission records. A confirmed delivery deadline is required for delay-based refunds; the ETA is only an estimate.</p>
      </PolicySubsection>
      <PolicySubsection title="Loss, damage & insurance">
        <p>A confirmed lost parcel or severe transport damage may qualify for a 100% delivery-fee refund; minor damage may qualify for 50%. The value of the goods is handled separately through liability and insurance review. Insurance costs 10% of the core fee but does not guarantee a matching compensation percentage.</p>
      </PolicySubsection>
      <PolicySubsection title="Handover and pickup deadlines">
        <p>Packages must be handed over at the origin hub within 3 hours after the order is placed. A Normal order still waiting for a flight after 3 hours is upgraded to Aging Priority and both you and the Operator are notified. After the drone lands at the destination hub, the recipient is reminded by email every 5 hours; if the package is not collected within 5 days, the order is cancelled automatically and you and the Operator are notified.</p>
      </PolicySubsection>
      <PolicySubsection title="Weather & customer-caused issues">
        <p>Weather-related delays or accepted rescheduling do not automatically qualify for a delay refund. If the paid service becomes impossible and no alternative is accepted, a full refund may be reviewed. Late drop-off, incorrect details, invalid parcels or uncollected deliveries are generally not refundable when solely caused by the Customer and the delivery obligation was met.</p>
      </PolicySubsection>
      <PolicySubsection title="How the amount is calculated">
        <p>Rates are based on eligible delivery fees actually paid, including relevant handling surcharges. A missed Express priority refunds the Express surcharge (currently 25% of core fee). Duplicate payments or excess charges are corrected in full for the duplicated or excess amount. The same service fee is never refunded twice.</p>
      </PolicySubsection>
      <p className="rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 py-2.5 text-[11px] leading-[1.65] text-white/[0.62]">This is a policy, subject to approval and applicable consumer rights. Refund requests are reviewed case by case.</p>
    </div>
  );
}

const REFUND_STEPS = [
  { title: "Contact support", detail: "Provide your order ID, payment reference, issue description and photos or other evidence if needed." },
  { title: "Claim review", detail: "Support verifies payment, hub handovers, mission events and the cause of the issue before deciding the eligible amount." },
  { title: "Refund decision", detail: "If approved, payment is returned through an available provider method. You may request a review of a rejection." },
];

function RefundClaimSteps() {
  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {REFUND_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-500/[0.25] bg-orange-500/[0.09] text-[12px] font-bold text-orange-300">{index + 1}</span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[12px] font-semibold text-white/[0.92]">{step.title}</p>
              <p className="mt-1 text-[12px] leading-[1.7] text-white/[0.68]">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          ["7 days", "Suggested claim window"],
          ["3 days", "Target first response"],
          ["5–15 days", "Target refund processing"],
        ].map(([time, description]) => (
          <div key={time} className="rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 py-2.5">
            <p className="text-[14px] font-semibold text-orange-300">{time}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/[0.58]">{description}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-[1.7] text-white/[0.60]">The 7-day reporting window is recommended (calendar days). Response and processing estimates use business days and are not guaranteed. This page does not submit claims or transfer refunds automatically; later claims may still be reviewed where justified or legally required.</p>
    </div>
  );
}

export function HelpPoliciesPage() {
  const [query, setQuery] =
    useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<HelpCategory>(
    "delivery",
  );

  const isSearching =
    query.trim().length > 0;

  const visibleArticles =
    useMemo(() => {
      const keyword =
        query
          .trim()
          .toLowerCase();

      if (keyword) {
        return ARTICLES.filter(
          (article) =>
            article.title
              .toLowerCase()
              .includes(keyword) ||
            article.summary
              .toLowerCase()
              .includes(keyword) ||
            article.content
              .toLowerCase()
              .includes(keyword),
        );
      }

      return ARTICLES.filter(
        (article) =>
          article.category ===
          selectedCategory,
      );
    }, [
      query,
      selectedCategory,
    ]);

  const activeCategory =
    CATEGORIES.find(
      (item) =>
        item.id ===
        selectedCategory,
    );

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-7 sm:px-6 sm:pt-10 lg:px-8">
      <section className="mx-auto max-w-[760px] text-center">
        <h1 className="text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-[44px]">
          How can we help?
        </h1>

        <p className="mx-auto mt-3 max-w-[560px] text-[13px] leading-7 text-white/[0.88] sm:text-[14px]">
          Search for delivery, package,
          payment or policy information.
        </p>

        <div className="mx-auto mt-6 max-w-[620px]">
          <label className="flex h-[56px] items-center gap-3 rounded-[20px] border border-white/[0.14] bg-[#171419]/95 px-3 shadow-[0_12px_34px_rgba(0,0,0,0.22)] transition focus-within:border-orange-500/[0.48] focus-within:bg-[#1a161b] focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.08),0_14px_34px_rgba(0,0,0,0.24)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.055] text-white/[0.88]">
              <Search size={18} />
            </div>

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search delivery, payment, package..."
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-white outline-none placeholder:font-normal placeholder:text-white/[0.55]"
            />

            {query ? (
              <button
                type="button"
                onClick={() =>
                  setQuery("")
                }
                aria-label="Clear search"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/[0.62] transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={15} />
              </button>
            ) : null}
          </label>

          
        </div>
      </section>

      {!isSearching && (
        <section className="mt-9">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORIES.map(
              (category) => {
                const active =
                  category.id ===
                  selectedCategory;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(
                        category.id,
                      )
                    }
                    className={`group min-w-0 overflow-hidden rounded-[22px] border text-left transition ${active
                      ? "border-orange-500/[0.34] bg-orange-500/[0.05] shadow-[0_16px_32px_rgba(249,115,22,0.08)]"
                      : "border-white/[0.09] bg-[#151217]/88 hover:border-white/[0.16]"
                      }`}
                  >
                    <div className="relative h-[104px] overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-[#151217]/95" />
                    </div>

                    <div className="px-4 pb-4 pt-3">
                      <p className="text-[15px] font-bold leading-5 text-white sm:text-[16px]">
                        {category.title}
                      </p>

                      <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-white/[0.86]">
                        {category.description}
                      </p>
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </section>
      )}

      <section className="mx-auto mt-9 max-w-[860px]">
        <div className="mb-4">
          <h2 className="text-[23px] font-bold tracking-[-0.035em] text-white sm:text-[26px]">
            {isSearching
              ? "Search results"
              : activeCategory?.title}
          </h2>

          {isSearching ? (
            <p className="mt-1 text-[12px] leading-6 text-white/[0.82]">
              {`${visibleArticles.length} result${visibleArticles.length ===
                1
                ? ""
                : "s"
                }`}
            </p>
          ) : null}
        </div>

        {!isSearching && selectedCategory === "policy" && <RefundQuickGuide />}

        {visibleArticles.length >
          0 ? (
          <div className="overflow-hidden rounded-[20px] border border-white/[0.09] bg-[#151217]/92">
            {visibleArticles.map(
              (
                article,
                index,
              ) => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  last={
                    index ===
                    visibleArticles.length -
                    1
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-[20px] border border-white/[0.09] bg-[#151217]/90 px-5 py-10 text-center">
            <p className="text-[15px] font-semibold text-white">
              No results found
            </p>

            <p className="mt-2 text-[12px] leading-6 text-white/[0.80]">
              Try another keyword.
            </p>

            <button
              type="button"
              onClick={() =>
                setQuery("")
              }
              className="mt-4 text-[13px] font-semibold text-orange-400"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      <section className="mx-auto mt-8 max-w-[860px] rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white">
              Need delivery pricing?
            </p>

            <p className="mt-1 text-[12px] leading-6 text-white/[0.84]">
              Compare delivery modes,
              package sizes and fees.
            </p>
          </div>

          <a
            href="/customer/pricing"
            className="text-[13px] font-semibold text-orange-400 hover:text-orange-300"
          >
            View pricing & services
          </a>
        </div>
      </section>
    </div>
  );
}

function ArticleRow({
  article,
  last,
}: {
  article: HelpArticle;
  last: boolean;
}) {
  return (
    <details
      id={article.id}
      className={`group ${last
        ? ""
        : "border-b border-white/[0.07]"
        }`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-[18px] sm:px-5 sm:py-5">
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-6 text-white transition-colors group-open:text-orange-200 sm:text-[16px]">
            {article.title}
          </p>
        </div>

        <ChevronDown
          size={16}
          className="shrink-0 text-white/[0.70] transition-transform group-open:rotate-180 group-open:text-orange-400"
        />
      </summary>

      <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
        {article.id === "refund-rules" ? (
          <RefundRules />
        ) : article.id === "refund-claims" ? (
          <RefundClaimSteps />
        ) : (
          <p className="max-w-[720px] whitespace-pre-line text-[13px] leading-7 text-white/[0.92]">
            {article.content}
          </p>
        )}
      </div>
    </details>
  );
}
