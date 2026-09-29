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
    opacity: 0.5,
  },
  {
    left: "7%",
    size: 3,
    duration: "16s",
    delay: "-11s",
    color: "#f97316",
    drift: "-8px",
    opacity: 0.72,
  },
  {
    left: "11%",
    size: 2.5,
    duration: "20s",
    delay: "-6s",
    color: "#fdba74",
    drift: "12px",
    opacity: 0.58,
  },
  {
    left: "15%",
    size: 2,
    duration: "17s",
    delay: "-14s",
    color: "#ea580c",
    drift: "-10px",
    opacity: 0.5,
  },
  {
    left: "19%",
    size: 3.2,
    duration: "19s",
    delay: "-8s",
    color: "#fb923c",
    drift: "14px",
    opacity: 0.7,
  },
  {
    left: "23%",
    size: 2.2,
    duration: "22s",
    delay: "-4s",
    color: "#f97316",
    drift: "-12px",
    opacity: 0.56,
  },
  {
    left: "27%",
    size: 2.8,
    duration: "15s",
    delay: "-12s",
    color: "#fdba74",
    drift: "8px",
    opacity: 0.64,
  },
  {
    left: "31%",
    size: 2,
    duration: "18.5s",
    delay: "-7s",
    color: "#ea580c",
    drift: "-7px",
    opacity: 0.48,
  },
  {
    left: "35%",
    size: 3.2,
    duration: "17.5s",
    delay: "-15s",
    color: "#f97316",
    drift: "11px",
    opacity: 0.74,
  },
  {
    left: "39%",
    size: 2.4,
    duration: "21s",
    delay: "-10s",
    color: "#fb923c",
    drift: "-13px",
    opacity: 0.58,
  },
  {
    left: "43%",
    size: 2,
    duration: "16.5s",
    delay: "-5s",
    color: "#fdba74",
    drift: "9px",
    opacity: 0.5,
  },
  {
    left: "47%",
    size: 3,
    duration: "19.5s",
    delay: "-13s",
    color: "#f97316",
    drift: "-9px",
    opacity: 0.68,
  },
  {
    left: "51%",
    size: 2.2,
    duration: "17s",
    delay: "-3s",
    color: "#ea580c",
    drift: "10px",
    opacity: 0.52,
  },
  {
    left: "55%",
    size: 3.4,
    duration: "20.5s",
    delay: "-9s",
    color: "#fb923c",
    drift: "-14px",
    opacity: 0.75,
  },
  {
    left: "59%",
    size: 2,
    duration: "15.5s",
    delay: "-6s",
    color: "#fdba74",
    drift: "7px",
    opacity: 0.5,
  },
  {
    left: "63%",
    size: 2.6,
    duration: "18.8s",
    delay: "-16s",
    color: "#f97316",
    drift: "-11px",
    opacity: 0.64,
  },
  {
    left: "67%",
    size: 2,
    duration: "21.5s",
    delay: "-8s",
    color: "#ea580c",
    drift: "12px",
    opacity: 0.48,
  },
  {
    left: "71%",
    size: 3,
    duration: "17.2s",
    delay: "-4s",
    color: "#fb923c",
    drift: "-8px",
    opacity: 0.72,
  },
  {
    left: "75%",
    size: 2.2,
    duration: "19.8s",
    delay: "-11s",
    color: "#f97316",
    drift: "13px",
    opacity: 0.58,
  },
  {
    left: "79%",
    size: 2.8,
    duration: "16.8s",
    delay: "-14s",
    color: "#fdba74",
    drift: "-10px",
    opacity: 0.66,
  },
  {
    left: "83%",
    size: 2,
    duration: "22s",
    delay: "-7s",
    color: "#ea580c",
    drift: "9px",
    opacity: 0.48,
  },
  {
    left: "87%",
    size: 3.2,
    duration: "18.2s",
    delay: "-12s",
    color: "#fb923c",
    drift: "-12px",
    opacity: 0.76,
  },
  {
    left: "91%",
    size: 2.2,
    duration: "20s",
    delay: "-5s",
    color: "#f97316",
    drift: "10px",
    opacity: 0.58,
  },
  {
    left: "95%",
    size: 2.8,
    duration: "17.8s",
    delay: "-15s",
    color: "#fdba74",
    drift: "-9px",
    opacity: 0.68,
  },

  {
    left: "5%",
    size: 1.6,
    duration: "24s",
    delay: "-18s",
    color: "#fb923c",
    drift: "6px",
    opacity: 0.36,
  },
  {
    left: "13%",
    size: 1.4,
    duration: "26s",
    delay: "-9s",
    color: "#f97316",
    drift: "-6px",
    opacity: 0.32,
  },
  {
    left: "21%",
    size: 1.8,
    duration: "23s",
    delay: "-13s",
    color: "#fdba74",
    drift: "5px",
    opacity: 0.4,
  },
  {
    left: "29%",
    size: 1.5,
    duration: "25s",
    delay: "-4s",
    color: "#ea580c",
    drift: "-5px",
    opacity: 0.3,
  },
  {
    left: "37%",
    size: 1.7,
    duration: "22s",
    delay: "-16s",
    color: "#fb923c",
    drift: "7px",
    opacity: 0.36,
  },
  {
    left: "45%",
    size: 1.5,
    duration: "24.5s",
    delay: "-8s",
    color: "#f97316",
    drift: "-6px",
    opacity: 0.32,
  },
  {
    left: "53%",
    size: 1.8,
    duration: "26s",
    delay: "-14s",
    color: "#fdba74",
    drift: "5px",
    opacity: 0.38,
  },
  {
    left: "61%",
    size: 1.5,
    duration: "23.5s",
    delay: "-5s",
    color: "#ea580c",
    drift: "-7px",
    opacity: 0.3,
  },
  {
    left: "69%",
    size: 1.7,
    duration: "25.5s",
    delay: "-19s",
    color: "#fb923c",
    drift: "6px",
    opacity: 0.34,
  },
  {
    left: "77%",
    size: 1.5,
    duration: "24s",
    delay: "-10s",
    color: "#f97316",
    drift: "-5px",
    opacity: 0.3,
  },
  {
    left: "85%",
    size: 1.8,
    duration: "27s",
    delay: "-7s",
    color: "#fdba74",
    drift: "6px",
    opacity: 0.38,
  },
  {
    left: "93%",
    size: 1.5,
    duration: "23s",
    delay: "-15s",
    color: "#ea580c",
    drift: "-6px",
    opacity: 0.3,
  },
];

export function CustomerAnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050505]"
    >
      {/* soft glows */}
      <div className="absolute -left-[180px] top-[12%] h-[520px] w-[520px] rounded-full bg-orange-600/[0.045] blur-[170px]" />
      <div className="absolute right-[-200px] top-[40%] h-[560px] w-[560px] rounded-full bg-orange-400/[0.035] blur-[190px]" />
      <div className="absolute bottom-[-240px] left-[34%] h-[560px] w-[560px] rounded-full bg-orange-500/[0.03] blur-[200px]" />

      {/* subtle grid / scan texture */}
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
            0 0 ${particle.size * 6}px ${particle.color},
            0 0 ${particle.size * 12}px ${particle.color}88,
            0 0 ${particle.size * 18}px ${particle.color}44
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

      {/* edge fade */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_24%,rgba(0,0,0,0.16)_62%,rgba(0,0,0,0.46)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/[0.08] via-transparent to-black/[0.18]" />

      <style>
        {`
          .customer-particle {
            animation-name: customerParticleRise, customerParticleGlow;
            animation-timing-function: linear, ease-in-out;
            animation-iteration-count: infinite, infinite;
            animation-direction: normal, alternate;
            will-change: transform, opacity;
            mix-blend-mode: screen;
          }

          @keyframes customerParticleRise {
            0% {
              transform: translate3d(0, 0, 0) scale(0.9);
              opacity: 0;
            }

            8% {
              opacity: 0.45;
            }

            18% {
              opacity: 0.72;
            }

            70% {
              opacity: 0.78;
            }

            92% {
              opacity: 0.28;
            }

            100% {
              transform: translate3d(var(--drift), -125vh, 0) scale(1.06);
              opacity: 0;
            }
          }

          @keyframes customerParticleGlow {
            0% {
              filter: brightness(0.92);
            }

            50% {
              filter: brightness(1.2);
            }

            100% {
              filter: brightness(0.95);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .customer-particle {
              animation: none;
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
}