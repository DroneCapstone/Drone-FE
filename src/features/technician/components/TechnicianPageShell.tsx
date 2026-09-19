import {
  motion,
} from "framer-motion";

import type {
  ReactNode,
} from "react";

interface TechnicianPageShellProps {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

export function TechnicianPageShell({
  title,
  description,
  action,
  children,
}: TechnicianPageShellProps) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mx-auto max-w-[1600px] p-6 lg:p-8"
    >
      <header className="mb-7 flex items-start justify-between gap-5">
        <div>
          <h1
  className="
    text-[28px]
    font-semibold
    tracking-[-0.025em]
    text-zinc-100
  "
  style={{
    fontFamily:
      '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }}
>
  {title}
</h1>

          <p
  className="
    mt-1
    text-[12px]
    font-normal
    tracking-[0]
    text-zinc-500
  "
>
  {description}
</p>
        </div>

        {action}
      </header>

      {children}
    </motion.section>
  );
}