import {
  useLayoutEffect,
  useRef,
} from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import droneImage from "../../../assets/images/home/drone-3d.png";
import hubImage from "../../../assets/images/home/delivery-hub.png";
import droneArrive from "../../../assets/images/home/drone-arrive.png";

gsap.registerPlugin(ScrollTrigger);

export function HorizontalDeliverySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const desktopTrackRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const mobileProgressRef = useRef<HTMLDivElement>(null);
  const mobileStepRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const track = desktopTrackRef.current;

      if (!track) {
        return;
      }

      const getScrollDistance = () =>
        track.scrollWidth - window.innerWidth;

      const animation = gsap.to(track, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 76px",
          end: () => `+=${getScrollDistance()}`,
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

    mm.add("(max-width: 1023px)", () => {
      const track = mobileTrackRef.current;

      if (!track) {
        return;
      }

      const getScrollDistance = () =>
        track.scrollWidth - window.innerWidth;

      const animation = gsap.to(track, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 68px",
          end: () => `+=${Math.max(getScrollDistance(), window.innerWidth * 2.7)}`,
          scrub: 0.65,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (mobileProgressRef.current) {
              mobileProgressRef.current.style.width = `${Math.max(
                3,
                self.progress * 100,
              )}%`;
            }

            if (mobileStepRef.current) {
              const index = Math.min(
                3,
                Math.floor(self.progress * 4),
              );

              mobileStepRef.current.textContent = `0${index + 1}`;
            }
          },
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
      <div className="hidden h-[calc(100svh-76px)] overflow-hidden lg:block">
        <div
          ref={desktopTrackRef}
          className="flex h-full w-max"
        >
          <OrderSlide />
          <OriginHubSlide />
          <FlightSlide />
          <DestinationHubSlide />
        </div>
      </div>

      <div className="relative h-[calc(100svh-68px)] min-h-[640px] overflow-hidden lg:hidden">
        <div
          ref={mobileTrackRef}
          className="flex h-full w-max will-change-transform"
        >
          <OrderSlide mobile />
          <OriginHubSlide mobile />
          <FlightSlide mobile />
          <DestinationHubSlide mobile />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-5 right-5 z-40">
          <div className="mb-2.5 flex items-center justify-between">
            <span
              ref={mobileStepRef}
              className="text-[10px] font-semibold tracking-[0.16em] text-orange-300"
            >
              01
            </span>

            <span className="text-[9px] uppercase tracking-[0.16em] text-white/34">
              Scroll to continue
            </span>
          </div>

          <div className="h-px overflow-hidden bg-white/[0.12]">
            <div
              ref={mobileProgressRef}
              className="h-full bg-orange-500"
              style={{ width: "3%" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <article className="relative h-full w-screen shrink-0 overflow-hidden bg-[#050505] px-5 pb-16 pt-8">
        <div className="mx-auto flex h-full max-w-[520px] flex-col">
          <StepLabel number="01" label="Create delivery" />

          <h2 className="mt-5 text-[42px] font-medium leading-[0.94] tracking-[-0.05em]">
            It starts
            <br />
            with an order.
          </h2>

          <p className="mt-4 max-w-[390px] text-[13px] leading-6 text-white/62">
            Choose the hubs, package details and delivery mode before sending your request.
          </p>

          <div className="mt-7 overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#111013]/92">
            <InfoRow label="Origin hub" value="Central Hub" compact />
            <InfoRow label="Destination hub" value="City Center" compact />
            <InfoRow label="Package" value="2–5 kg" compact />
            <InfoRow label="Delivery" value="Express" compact />
          </div>

          <div className="mt-auto pt-5 text-[11px] leading-5 text-white/38">
            01 / 04 · Create the delivery request
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="relative h-full w-screen shrink-0 bg-[#050505]">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[0.85fr_1.15fr] items-center px-12">
        <div>
          <StepLabel number="01" label="Create delivery" />

          <h2 className="mt-8 max-w-[650px] text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[74px]">
            It starts
            <br />
            with an order.
          </h2>

          <p className="mt-7 max-w-[460px] text-[14px] leading-7 text-white/40">
            Select the origin hub, destination and package information before submitting the delivery request.
          </p>
        </div>

        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-[680px] lg:w-[72%]">
            <InfoRow label="Origin hub" value="Central Hub" />
            <InfoRow label="Destination hub" value="City Center" />
            <InfoRow label="Package" value="2-5 kg" />
            <InfoRow label="Delivery" value="Express" />
          </div>
        </div>
      </div>

      <SlideFooter current="01" label="Create delivery" />
    </article>
  );
}

function OriginHubSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <article className="relative h-full w-screen shrink-0 overflow-hidden bg-[#080808] px-5 pb-16 pt-8">
        <div className="mx-auto flex h-full max-w-[520px] flex-col">
          <StepLabel number="02" label="Origin hub" />

          <h2 className="mt-5 text-[41px] font-medium leading-[0.94] tracking-[-0.05em]">
            Checked in.
            <br />
            Ready to fly.
          </h2>

          <p className="mt-4 max-w-[390px] text-[13px] leading-6 text-white/62">
            Your package is checked at the selected origin hub and prepared for aircraft dispatch.
          </p>

          <div className="relative mt-5 min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#0b0b0b]">
            <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.07] blur-[90px]" />
            <img
              src={hubImage}
              alt="DroneOptAI origin hub"
              className="absolute inset-0 h-full w-full object-contain p-3"
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="relative h-full w-screen shrink-0 overflow-hidden bg-[#080808]">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[1.12fr_0.88fr] items-center">
        <div className="relative flex h-full items-center justify-center overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f47721]/[0.04] blur-[160px]" />

          <img
            src={hubImage}
            alt="DroneOptAI origin hub"
            className="relative z-10 w-[92%] max-w-[940px] object-contain"
          />

          <div className="absolute bottom-14 left-12 z-20">
            <div className="mb-3 h-px w-14 bg-white/20" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
              Origin hub
            </p>
          </div>
        </div>

        <div className="px-14 xl:px-20">
          <StepLabel number="02" label="Origin hub" />

          <h2 className="mt-8 text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[70px]">
            Checked in.
            <br />
            Ready to fly.
          </h2>

          <p className="mt-7 max-w-[440px] text-[14px] leading-7 text-white/40">
            The sender brings the package to the selected origin hub, where it is checked and prepared for aircraft dispatch.
          </p>
        </div>
      </div>

      <SlideFooter current="02" label="Origin hub" />
    </article>
  );
}

function FlightSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <article className="relative h-full w-screen shrink-0 overflow-hidden bg-[#050505] px-5 pb-16 pt-8">
        <div className="mx-auto flex h-full max-w-[520px] flex-col">
          <StepLabel number="03" label="In flight" />

          <h2 className="mt-5 text-[42px] font-medium leading-[0.94] tracking-[-0.05em]">
            Hub
            <br />
            to hub.
          </h2>

          <p className="mt-4 max-w-[390px] text-[13px] leading-6 text-white/62">
            The aircraft follows the planned route while mission progress stays visible throughout the flight.
          </p>

          <div className="relative mt-5 min-h-0 flex-1 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.06] blur-[90px]" />
            <img
              src={droneImage}
              alt="DroneOptAI aircraft in flight"
              className="absolute inset-0 h-full w-full object-contain p-1"
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="relative h-full w-screen shrink-0 overflow-hidden bg-[#050505]">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[0.7fr_1.3fr] items-center px-12">
        <div className="relative z-20">
          <StepLabel number="03" label="In flight" />

          <h2 className="mt-8 text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[74px]">
            Hub
            <br />
            to hub.
          </h2>

          <p className="mt-7 max-w-[420px] text-[14px] leading-7 text-white/40">
            The assigned aircraft transports the package through the planned route while mission progress remains visible throughout the flight.
          </p>
        </div>

        <div className="relative flex h-full items-center justify-center">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED742E]/[0.035] blur-[150px]" />

          <img
            src={droneImage}
            alt="DroneOptAI aircraft in flight"
            className="relative z-20 w-[88%] max-w-[900px] object-contain"
          />
        </div>
      </div>

      <SlideFooter current="03" label="In flight" />
    </article>
  );
}

function DestinationHubSlide({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <article className="relative h-full w-screen shrink-0 overflow-hidden bg-[#080808] px-5 pb-16 pt-8">
        <div className="mx-auto flex h-full max-w-[520px] flex-col">
          <StepLabel number="04" label="Destination hub" />

          <h2 className="mt-5 text-[40px] font-medium leading-[0.94] tracking-[-0.05em]">
            Arrived.
            <br />
            Ready to collect.
          </h2>

          <p className="mt-4 max-w-[390px] text-[13px] leading-6 text-white/62">
            The package is processed at the destination hub and prepared for recipient collection.
          </p>

          <div className="relative mt-5 min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#0b0b0b]">
            <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.07] blur-[90px]" />
            <img
              src={droneArrive}
              alt="DroneOptAI destination hub"
              className="absolute inset-0 h-full w-full object-contain p-3"
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="relative h-full w-screen shrink-0 overflow-hidden bg-[#080808]">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[0.82fr_1.18fr] items-center">
        <div className="px-0 lg:px-12">
          <StepLabel number="04" label="Destination hub" />

          <h2 className="mt-8 text-5xl font-medium leading-[0.96] tracking-[-0.05em] lg:text-[70px]">
            Arrived.
            <br />
            Ready to collect.
          </h2>

          <p className="mt-7 max-w-[450px] text-[14px] leading-7 text-white/40">
            The aircraft lands at the destination hub, where the package is processed and prepared for recipient collection.
          </p>
        </div>

        <div className="relative flex h-full items-center justify-center overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f47721]/[0.04] blur-[160px]" />

          <img
            src={droneArrive}
            alt="DroneOptAI destination hub"
            className="relative z-10 w-[92%] max-w-[940px] object-contain"
          />
        </div>
      </div>

      <SlideFooter current="04" label="Destination hub" />
    </article>
  );
}

function StepLabel({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 lg:gap-5">
      <span className="text-[11px] font-medium text-[#f47721]">
        {number}
      </span>

      <div className="h-px w-9 bg-white/15 lg:w-12" />

      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40 lg:text-[10px] lg:tracking-[0.2em] lg:text-white/30">
        {label}
      </span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-6 border-t border-white/[0.09] first:border-t-0 last:border-b-0 ${
        compact ? "px-4 py-4" : "py-7"
      }`}
    >
      <div>
        <p
          className={`uppercase tracking-[0.16em] text-white/38 ${
            compact ? "text-[9px]" : "text-[10px]"
          }`}
        >
          {label}
        </p>

        <p
          className={`font-medium text-white/90 ${
            compact ? "mt-1.5 text-[15px]" : "mt-3 text-xl"
          }`}
        >
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
