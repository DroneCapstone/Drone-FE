import type { CSSProperties } from "react";

type ParticleConfig = {
  left: string;
  size: number;
  duration: string;
  delay: string;
  color: string;
  drift: string;
  opacity: number;
};

const particles: ParticleConfig[] = [
  {
    left: "3%",
    size: 2,
    duration: "18s",
    delay: "-2s",
    color: "#fb923c",
    drift: "10px",
    opacity: 0.62,
  },
  {
    left: "7%",
    size: 3,
    duration: "16s",
    delay: "-11s",
    color: "#f97316",
    drift: "-8px",
    opacity: 0.82,
  },
  {
    left: "11%",
    size: 2.5,
    duration: "20s",
    delay: "-6s",
    color: "#fdba74",
    drift: "12px",
    opacity: 0.68,
  },
  {
    left: "15%",
    size: 2,
    duration: "17s",
    delay: "-14s",
    color: "#ea580c",
    drift: "-10px",
    opacity: 0.6,
  },
  {
    left: "19%",
    size: 3.2,
    duration: "19s",
    delay: "-8s",
    color: "#fb923c",
    drift: "14px",
    opacity: 0.8,
  },
  {
    left: "23%",
    size: 2.2,
    duration: "22s",
    delay: "-4s",
    color: "#f97316",
    drift: "-12px",
    opacity: 0.66,
  },
  {
    left: "27%",
    size: 2.8,
    duration: "15s",
    delay: "-12s",
    color: "#fdba74",
    drift: "8px",
    opacity: 0.72,
  },
  {
    left: "31%",
    size: 2,
    duration: "18.5s",
    delay: "-7s",
    color: "#ea580c",
    drift: "-7px",
    opacity: 0.58,
  },
  {
    left: "35%",
    size: 3.2,
    duration: "17.5s",
    delay: "-15s",
    color: "#f97316",
    drift: "11px",
    opacity: 0.84,
  },
  {
    left: "39%",
    size: 2.4,
    duration: "21s",
    delay: "-10s",
    color: "#fb923c",
    drift: "-13px",
    opacity: 0.68,
  },
  {
    left: "43%",
    size: 2,
    duration: "16.5s",
    delay: "-5s",
    color: "#fdba74",
    drift: "9px",
    opacity: 0.6,
  },
  {
    left: "47%",
    size: 3,
    duration: "19.5s",
    delay: "-13s",
    color: "#f97316",
    drift: "-9px",
    opacity: 0.78,
  },
  {
    left: "51%",
    size: 2.2,
    duration: "17s",
    delay: "-3s",
    color: "#ea580c",
    drift: "10px",
    opacity: 0.62,
  },
  {
    left: "55%",
    size: 3.4,
    duration: "20.5s",
    delay: "-9s",
    color: "#fb923c",
    drift: "-14px",
    opacity: 0.86,
  },
  {
    left: "59%",
    size: 2,
    duration: "15.5s",
    delay: "-6s",
    color: "#fdba74",
    drift: "7px",
    opacity: 0.6,
  },
  {
    left: "63%",
    size: 2.6,
    duration: "18.8s",
    delay: "-16s",
    color: "#f97316",
    drift: "-11px",
    opacity: 0.72,
  },
  {
    left: "67%",
    size: 2,
    duration: "21.5s",
    delay: "-8s",
    color: "#ea580c",
    drift: "12px",
    opacity: 0.56,
  },
  {
    left: "71%",
    size: 3,
    duration: "17.2s",
    delay: "-4s",
    color: "#fb923c",
    drift: "-8px",
    opacity: 0.82,
  },
  {
    left: "75%",
    size: 2.2,
    duration: "19.8s",
    delay: "-11s",
    color: "#f97316",
    drift: "13px",
    opacity: 0.68,
  },
  {
    left: "79%",
    size: 2.8,
    duration: "16.8s",
    delay: "-14s",
    color: "#fdba74",
    drift: "-10px",
    opacity: 0.76,
  },
  {
    left: "83%",
    size: 2,
    duration: "22s",
    delay: "-7s",
    color: "#ea580c",
    drift: "9px",
    opacity: 0.56,
  },
  {
    left: "87%",
    size: 3.2,
    duration: "18.2s",
    delay: "-12s",
    color: "#fb923c",
    drift: "-12px",
    opacity: 0.88,
  },
  {
    left: "91%",
    size: 2.2,
    duration: "20s",
    delay: "-5s",
    color: "#f97316",
    drift: "10px",
    opacity: 0.68,
  },
  {
    left: "95%",
    size: 2.8,
    duration: "17.8s",
    delay: "-15s",
    color: "#fdba74",
    drift: "-9px",
    opacity: 0.76,
  },

  {
    left: "5%",
    size: 1.6,
    duration: "24s",
    delay: "-18s",
    color: "#fb923c",
    drift: "6px",
    opacity: 0.44,
  },
  {
    left: "13%",
    size: 1.4,
    duration: "26s",
    delay: "-9s",
    color: "#f97316",
    drift: "-6px",
    opacity: 0.4,
  },
  {
    left: "21%",
    size: 1.8,
    duration: "23s",
    delay: "-13s",
    color: "#fdba74",
    drift: "5px",
    opacity: 0.48,
  },
  {
    left: "29%",
    size: 1.5,
    duration: "25s",
    delay: "-4s",
    color: "#ea580c",
    drift: "-5px",
    opacity: 0.38,
  },
  {
    left: "37%",
    size: 1.7,
    duration: "22s",
    delay: "-16s",
    color: "#fb923c",
    drift: "7px",
    opacity: 0.44,
  },
  {
    left: "45%",
    size: 1.5,
    duration: "24.5s",
    delay: "-8s",
    color: "#f97316",
    drift: "-6px",
    opacity: 0.4,
  },
  {
    left: "53%",
    size: 1.8,
    duration: "26s",
    delay: "-14s",
    color: "#fdba74",
    drift: "5px",
    opacity: 0.48,
  },
  {
    left: "61%",
    size: 1.5,
    duration: "23.5s",
    delay: "-5s",
    color: "#ea580c",
    drift: "-7px",
    opacity: 0.38,
  },
  {
    left: "69%",
    size: 1.7,
    duration: "25.5s",
    delay: "-19s",
    color: "#fb923c",
    drift: "6px",
    opacity: 0.44,
  },
  {
    left: "77%",
    size: 1.5,
    duration: "24s",
    delay: "-10s",
    color: "#f97316",
    drift: "-5px",
    opacity: 0.4,
  },
  {
    left: "85%",
    size: 1.8,
    duration: "27s",
    delay: "-7s",
    color: "#fdba74",
    drift: "6px",
    opacity: 0.48,
  },
  {
    left: "93%",
    size: 1.5,
    duration: "23s",
    delay: "-15s",
    color: "#ea580c",
    drift: "-6px",
    opacity: 0.38,
  },
];

export function CustomerAnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(180,72,18,0.22), transparent 30%), radial-gradient(circle at top right, rgba(249,115,22,0.12), transparent 26%), radial-gradient(circle at bottom center, rgba(234,88,12,0.10), transparent 34%), linear-gradient(180deg, #120c09 0%, #0c0908 42%, #070606 100%)",
      }}
    >
      {/* warm glows */}
      <div className="absolute -left-[120px] top-[8%] h-[560px] w-[560px] rounded-full bg-orange-500/[0.12] blur-[170px]" />
      <div className="absolute right-[-180px] top-[18%] h-[540px] w-[540px] rounded-full bg-orange-400/[0.1] blur-[180px]" />
      <div className="absolute bottom-[-220px] left-[28%] h-[620px] w-[620px] rounded-full bg-orange-600/[0.08] blur-[220px]" />
      <div className="absolute left-[48%] top-[38%] h-[400px] w-[400px] rounded-full bg-amber-400/[0.05] blur-[160px]" />

      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:120px_120px]" />

      {/* particles */}
      {particles.map((particle, index) => {
        const style: CSSProperties & {
          "--drift"?: string;
        } = {
          left: particle.left,
          bottom: "-14vh",
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          backgroundColor: particle.color,
          opacity: particle.opacity,
          animationDelay: particle.delay,
          animationDuration: particle.duration,
          boxShadow: `
            0 0 ${particle.size * 8}px ${particle.color},
            0 0 ${particle.size * 16}px ${particle.color}cc,
            0 0 ${particle.size * 24}px ${particle.color}88
          `,
          "--drift": particle.drift,
        };

        return (
          <span
            key={`${particle.left}-${index}`}
            className="customer-particle absolute rounded-full"
            style={style}
          />
        );
      })}

      {/* edge fade nhẹ hơn */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(0,0,0,0.10)_58%,rgba(0,0,0,0.22)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] via-transparent to-black/[0.08]" />

      <style>
        {`
          .customer-particle {
            animation-name: customerParticleRise, customerParticleGlow;
            animation-timing-function: linear, ease-in-out;
            animation-iteration-count: infinite, infinite;
            animation-direction: normal, alternate;
            will-change: transform, opacity, filter;
            mix-blend-mode: screen;
          }

          @keyframes customerParticleRise {
            0% {
              transform: translate3d(0, 0, 0) scale(0.9);
              opacity: 0;
            }

            8% {
              opacity: 0.62;
            }

            18% {
              opacity: 1;
            }

            70% {
              opacity: 1;
            }

            92% {
              opacity: 0.42;
            }

            100% {
              transform: translate3d(var(--drift), -125vh, 0) scale(1.08);
              opacity: 0;
            }
          }

          @keyframes customerParticleGlow {
            0% {
              filter: brightness(1.05);
            }

            50% {
              filter: brightness(1.65);
            }

            100% {
              filter: brightness(1.12);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .customer-particle {
              animation: none;
              opacity: 0.6;
            }
          }
        `}
      </style>
    </div>
  );
}