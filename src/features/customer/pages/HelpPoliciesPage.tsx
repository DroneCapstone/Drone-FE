import {
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
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
      "Insurance, changes and cancellation.",
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
      "DroneOptAI deliveries operate between selected hubs. The sender brings the package to the origin hub, and the recipient collects it at the destination hub.",
  },
  {
    id: "handover-deadline",
    category: "delivery",
    title: "Handover deadline",
    summary:
      "When your package must reach the origin hub.",
    content:
      "Bring the package to the selected origin hub before the handover deadline shown in your order. Late handover may move the delivery to a later available slot.",
  },
  {
    id: "delivery-modes",
    category: "delivery",
    title: "Scheduled and Express delivery",
    summary:
      "Choose the service that fits the urgency of your shipment.",
    content:
      "Scheduled delivery is intended for flexible shipments. Express delivery prioritizes time-sensitive shipments and currently adds a 25% surcharge based on the core fee.",
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
      "Package insurance is optional. When selected, the current pricing rule adds 10% of the core fee to the quotation.",
  },
  {
    id: "changes-cancellation",
    category: "policy",
    title: "Order changes and cancellation",
    summary:
      "Availability depends on the current order stage.",
    content:
      "Open the delivery details to review the current order and payment status before making changes. Cancellation availability depends on the current order stage.",
  },
];

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
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-300">
          Help & policies
        </p>

        <h1 className="mt-3 text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-[44px]">
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

          <p className="mt-2 text-center text-[11px] text-white/[0.62]">
            Try “payment”, “package limit” or “handover”.
          </p>
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
                    className={`group min-w-0 overflow-hidden rounded-[22px] border text-left transition ${
                      active
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
              {`${visibleArticles.length} result${
                visibleArticles.length ===
                1
                  ? ""
                  : "s"
              }`}
            </p>
          ) : null}
        </div>

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
      className={`group ${
        last
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
        <p className="max-w-[720px] text-[13px] leading-7 text-white/[0.92]">
          {article.content}
        </p>
      </div>
    </details>
  );
}
