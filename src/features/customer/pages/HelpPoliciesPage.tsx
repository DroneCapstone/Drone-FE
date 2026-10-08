import {
  ChevronDown,
  CreditCard,
  Package,
  Search,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

const CATEGORIES: Array<{
  id: HelpCategory;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "delivery",
    title: "Delivery & handover",
    description:
      "Hub delivery, deadlines and delivery modes.",
    icon: <Truck size={18} />,
  },
  {
    id: "package",
    title: "Package rules",
    description:
      "Package size, weight and fragile items.",
    icon: <Package size={18} />,
  },
  {
    id: "payment",
    title: "Pricing & payment",
    description:
      "Quotation, checkout and payment status.",
    icon: <CreditCard size={18} />,
  },
  {
    id: "policy",
    title: "Insurance & policies",
    description:
      "Insurance, changes and cancellation.",
    icon: <ShieldCheck size={18} />,
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
      {/* SIMPLE HELP CENTER HEADER */}
      <section className="mx-auto max-w-[760px] text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-400">
          Help & policies
        </p>

        <h1 className="mt-3 text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-[44px]">
          How can we help?
        </h1>

        <p className="mx-auto mt-3 max-w-[560px] text-[12px] leading-6 text-white/[0.68] sm:text-[13px]">
          Search for delivery, package,
          payment or policy information.
        </p>

        <div className="mx-auto mt-6 max-w-[620px]">
          <label className="flex h-[54px] items-center gap-3 rounded-2xl border border-white/[0.14] bg-[#171419]/95 px-3 shadow-[0_12px_34px_rgba(0,0,0,0.22)] transition focus-within:border-orange-500/[0.48] focus-within:bg-[#1a161b] focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.08),0_14px_34px_rgba(0,0,0,0.24)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.055] text-white/[0.72]">
              <Search size={17} />
            </div>

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search delivery, payment, package..."
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-white outline-none placeholder:font-normal placeholder:text-white/[0.46]"
            />

            {query ? (
              <button
                type="button"
                onClick={() =>
                  setQuery("")
                }
                aria-label="Clear search"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/[0.48] transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={15} />
              </button>
            ) : null}
          </label>

         
        </div>
      </section>

      {/* CATEGORY NAVIGATION */}
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
                    key={
                      category.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedCategory(
                        category.id,
                      )
                    }
                    className={`min-w-0 rounded-[18px] border p-4 text-left transition ${
                      active
                        ? "border-orange-500/[0.30] bg-orange-500/[0.07]"
                        : "border-white/[0.09] bg-[#151217]/88 hover:border-white/[0.15]"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        active
                          ? "bg-orange-500/[0.13] text-orange-300"
                          : "bg-white/[0.04] text-white/[0.54]"
                      }`}
                    >
                      {
                        category.icon
                      }
                    </div>

                    <p className="mt-3 text-[12px] font-semibold leading-5 text-white/[0.96] sm:text-[13px]">
                      {
                        category.title
                      }
                    </p>

                    <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-white/[0.56] sm:text-[10px]">
                      {
                        category.description
                      }
                    </p>
                  </button>
                );
              },
            )}
          </div>
        </section>
      )}

      {/* ARTICLES */}
      <section className="mx-auto mt-9 max-w-[860px]">
        <div className="mb-4">
          <h2 className="text-[19px] font-semibold tracking-[-0.03em] text-white sm:text-[21px]">
            {isSearching
              ? "Search results"
              : activeCategory?.title}
          </h2>

          <p className="mt-1 text-[10px] text-white/[0.58] sm:text-[11px]">
            {isSearching
              ? `${visibleArticles.length} result${
                  visibleArticles.length ===
                  1
                    ? ""
                    : "s"
                }`
              : activeCategory?.description}
          </p>
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
                  key={
                    article.id
                  }
                  article={
                    article
                  }
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
            <p className="text-[14px] font-semibold text-white">
              No results found
            </p>

            <p className="mt-2 text-[10px] leading-5 text-white/[0.58]">
              Try another keyword.
            </p>

            <button
              type="button"
              onClick={() =>
                setQuery("")
              }
              className="mt-4 text-[12px] font-semibold text-orange-400"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      {/* SMALL FOOTER HELP */}
      <section className="mx-auto mt-8 max-w-[860px] rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold text-white/[0.92]">
              Need delivery pricing?
            </p>

            <p className="mt-1 text-[10px] leading-5 text-white/[0.56]">
              Compare delivery modes,
              package sizes and fees.
            </p>
          </div>

          <a
            href="/customer/pricing"
            className="text-[12px] font-semibold text-orange-400 hover:text-orange-300"
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
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-white/[0.94] sm:text-[13px]">
            {article.title}
          </p>

          <p className="mt-1 line-clamp-1 text-[10px] text-white/[0.54]">
            {article.summary}
          </p>
        </div>

        <ChevronDown
          size={16}
          className="shrink-0 text-white/[0.48] transition-transform group-open:rotate-180 group-open:text-orange-400"
        />
      </summary>

      <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
        <p className="max-w-[720px] text-[11px] leading-6 text-white/[0.72]">
          {article.content}
        </p>
      </div>
    </details>
  );
}
