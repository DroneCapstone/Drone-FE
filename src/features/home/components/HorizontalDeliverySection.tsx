import { useLayoutEffect, useRef } from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import droneImage from "../../../assets/images/home/drone-3d.png";
import hubImage from "../../../assets/images/home/delivery-hub.png";
import droneArrive from "../../../assets/images/home/drone-arrive.png";
gsap.registerPlugin(ScrollTrigger);

export function HorizontalDeliverySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;

    if (!section || !track) {
      return;
    }

    const mm = gsap.matchMedia();

    /*
     * DESKTOP
     * Scroll dọc -> translate ngang.
     */
    mm.add("(min-width: 1024px)", () => {
      const getScrollDistance = () =>
        track.scrollWidth - window.innerWidth;

      const animation = gsap.to(track, {
        x: () => -getScrollDistance(),

        ease: "none",

        scrollTrigger: {
          trigger: section,

          /*
           * Header của bạn cao 76px.
           */
          start: "top 76px",

          /*
           * Scroll đúng bằng khoảng cách
           * cần di chuyển ngang.
           */
          end: () =>
            `+=${getScrollDistance()}`,

          scrub: 1,

          pin: true,

          pinSpacing: true,

          anticipatePin: 1,

          invalidateOnRefresh: true,
        },
      });

      return () => {
        animation.scrollTrigger?.kill();
        animation.kill();
      };
    });

    ScrollTrigger.refresh();

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="delivery"
      className="relative bg-[#050505]"
    >
      {/* =====================================================
          DESKTOP HORIZONTAL
      ====================================================== */}
      <div className="hidden h-[calc(100svh-76px)] overflow-hidden lg:block">
        <div
          ref={trackRef}
          className="flex h-full w-max"
        >
          <OrderSlide />

          <OriginHubSlide />

          <FlightSlide />

          <DestinationHubSlide />
        </div>
      </div>

      {/* =====================================================
          MOBILE
          Không horizontal để UX mobile dễ dùng.
      ====================================================== */}
      <div className="lg:hidden">
        <OrderSlide mobile />

        <OriginHubSlide mobile />

        <FlightSlide mobile />

        <DestinationHubSlide mobile />
      </div>
    </section>
  );
}

/* =========================================================
   01 — ORDER
========================================================= */

function OrderSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  return (
    <article
      className={
        mobile
          ? "relative min-h-[760px] border-b border-white/[0.08] bg-[#050505] px-6 py-20"
          : "relative h-full w-screen shrink-0 bg-[#050505]"
      }
    >
      <div
        className={
          mobile
            ? "mx-auto max-w-[700px]"
            : "mx-auto grid h-full max-w-[1600px] grid-cols-[0.85fr_1.15fr] items-center px-12"
        }
      >
        {/* LEFT */}
        <div>
          <StepLabel
            number="01"
            label="Create delivery"
          />

          <h2 className="mt-8 max-w-[650px] text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[74px]">
            It starts
            <br />
            with an order.
          </h2>

          <p className="mt-7 max-w-[460px] text-[14px] leading-7 text-white/40">
            Select the origin hub,
            destination and package
            information before submitting
            the delivery request.
          </p>
        </div>

        {/* RIGHT */}
        <div
          className={
            mobile
              ? "mt-14"
              : "flex h-full items-center justify-center"
          }
        >
          <div className="w-full max-w-[680px] lg:w-[72%]">
            <InfoRow
              label="Origin hub"
              value="Central Hub"
            />

            <InfoRow
              label="Destination hub"
              value="City Center"
            />

            <InfoRow
              label="Package"
              value="2-5 kg"
            />

            <InfoRow
              label="Delivery"
              value="Express"
            />
          </div>
        </div>
      </div>

      {!mobile && (
        <SlideFooter
          current="01"
          label="Create delivery"
        />
      )}
    </article>
  );
}

/* =========================================================
   02 — ORIGIN HUB
========================================================= */

function OriginHubSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  return (
    <article
      className={
        mobile
          ? "relative min-h-[800px] border-b border-white/[0.08] bg-[#080808] px-6 py-20"
          : "relative h-full w-screen shrink-0 overflow-hidden bg-[#080808]"
      }
    >
      <div
        className={
          mobile
            ? "mx-auto max-w-[700px]"
            : "mx-auto grid h-full max-w-[1600px] grid-cols-[1.12fr_0.88fr] items-center"
        }
      >
        {/* HUB */}
        <div
          className={
            mobile
              ? "relative mt-12 flex items-center justify-center"
              : "relative flex h-full items-center justify-center overflow-hidden"
          }
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f47721]/[0.04] blur-[160px]" />

          <img
            src={hubImage}
            alt="DroneOptAI origin hub"
            className="relative z-10 w-[92%] max-w-[940px] object-contain"
          />

          {!mobile && (
            <div className="absolute bottom-14 left-12 z-20">
              <div className="mb-3 h-px w-14 bg-white/20" />

              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Origin hub
              </p>
            </div>
          )}
        </div>

        {/* TEXT */}
        <div
          className={
            mobile
              ? "order-first"
              : "px-14 xl:px-20"
          }
        >
          <StepLabel
            number="02"
            label="Origin hub"
          />

          <h2 className="mt-8 text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[70px]">
            Checked in.
            <br />
            Ready to fly.
          </h2>

          <p className="mt-7 max-w-[440px] text-[14px] leading-7 text-white/40">
            The sender brings the package
            to the selected origin hub, where
            it is checked and prepared for
            aircraft dispatch.
          </p>
        </div>
      </div>

      {!mobile && (
        <SlideFooter
          current="02"
          label="Origin hub"
        />
      )}
    </article>
  );
}

/* =========================================================
   03 — FLIGHT
========================================================= */

function FlightSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  return (
    <article
      className={
        mobile
          ? "relative min-h-[780px] border-b border-white/[0.08] bg-[#050505] px-6 py-20"
          : "relative h-full w-screen shrink-0 overflow-hidden bg-[#050505]"
      }
    >
      <div
        className={
          mobile
            ? "mx-auto max-w-[700px]"
            : "mx-auto grid h-full max-w-[1600px] grid-cols-[0.7fr_1.3fr] items-center px-12"
        }
      >
        {/* TEXT */}
        <div className="relative z-20">
          <StepLabel
            number="03"
            label="In flight"
          />

          <h2 className="mt-8 text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[74px]">
            Hub
            <br />
            to hub.
          </h2>

          <p className="mt-7 max-w-[420px] text-[14px] leading-7 text-white/40">
            The assigned aircraft transports
            the package through the planned
            route while mission progress remains
            visible throughout the flight.
          </p>
        </div>

        {/* DRONE */}
        <div
          className={
            mobile
              ? "relative mt-14 flex items-center justify-center"
              : "relative flex h-full items-center justify-center"
          }
        >
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED742E]/[0.035] blur-[150px]" />

          <img
            src={droneImage}
            alt="DroneOptAI aircraft in flight"
            className="relative z-20 w-[88%] max-w-[900px] object-contain"
          />
        </div>
      </div>

      {!mobile && (
        <SlideFooter
          current="03"
          label="In flight"
        />
      )}
    </article>
  );
}

/* =========================================================
   04 — DESTINATION HUB
========================================================= */

function DestinationHubSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  return (
    <article
      className={
        mobile
          ? "relative min-h-[800px] bg-[#080808] px-6 py-20"
          : "relative h-full w-screen shrink-0 overflow-hidden bg-[#080808]"
      }
    >
      <div
        className={
          mobile
            ? "mx-auto max-w-[700px]"
            : "mx-auto grid h-full max-w-[1600px] grid-cols-[0.82fr_1.18fr] items-center"
        }
      >
        {/* TEXT */}
        <div className="px-0 lg:px-12">
          <StepLabel
            number="04"
            label="Destination hub"
          />

          <h2 className="mt-8 text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[70px]">
            Arrived.
            <br />
            Ready to collect.
          </h2>

          <p className="mt-7 max-w-[450px] text-[14px] leading-7 text-white/40">
            The aircraft lands at the
            destination hub, where the package
            is processed and prepared for
            recipient collection.
          </p>
        </div>

        {/* HUB */}
        <div
          className={
            mobile
              ? "relative mt-14 flex items-center justify-center"
              : "relative flex h-full items-center justify-center overflow-hidden"
          }
        >
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f47721]/[0.04] blur-[160px]" />

          <img
            src={droneArrive}
            alt="DroneOptAI destination hub"
            className="relative z-10 w-[92%] max-w-[940px] object-contain"
          />
        </div>
      </div>

      {!mobile && (
        <SlideFooter
          current="04"
          label="Destination hub"
        />
      )}
    </article>
  );
}

/* =========================================================
   SHARED
========================================================= */

interface StepLabelProps {
  number: string;
  label: string;
}

function StepLabel({
  number,
  label,
}: StepLabelProps) {
  return (
    <div className="flex items-center gap-5">
      <span className="text-[11px] text-[#f47721]">
        {number}
      </span>

      <div className="h-px w-12 bg-white/15" />

      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
        {label}
      </span>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-8 border-t border-white/[0.1] py-7 last:border-b">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">
          {label}
        </p>

        <p className="mt-3 text-xl font-medium text-white/85">
          {value}
        </p>
      </div>

      <span className="h-1.5 w-1.5 rounded-full bg-[#f47721]" />
    </div>
  );
}

function SlideFooter({
  current,
  label,
}: {
  current: string;
  label: string;
}) {
  return (
    <div className="pointer-events-none absolute bottom-7 left-10 right-10 z-30 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <span className="text-[10px] tracking-[0.18em] text-white/25">
          {current} / 04
        </span>

        <div className="h-px w-10 bg-white/15" />

        <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
          {label}
        </span>
      </div>

      <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
        Scroll to continue
      </span>
    </div>
  );
}