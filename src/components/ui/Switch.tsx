import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-[19px] w-[35px] shrink-0 cursor-pointer items-center rounded-full border-0 bg-[var(--surface-3)] p-0 outline-none transition-colors data-[state=checked]:bg-[var(--orange)] focus-visible:ring-2 focus-visible:ring-[var(--orange)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-[13px] translate-x-[3px] rounded-full bg-[var(--faint)] shadow-sm transition-transform data-[state=checked]:translate-x-[19px] data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  );
}
