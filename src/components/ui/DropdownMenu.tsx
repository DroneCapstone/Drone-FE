import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 10,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-80 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex min-h-9 cursor-default select-none items-center gap-2 rounded-sm px-2 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export const DropdownMenuLabel = DropdownMenuPrimitive.Label;
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator;
