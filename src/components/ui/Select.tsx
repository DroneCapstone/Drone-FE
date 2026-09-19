import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <Icon name="chevron" size={15} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "z-[9999] max-h-80 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl data-[state=closed]:animate-out data-[state=open]:animate-in",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex min-h-10 w-full cursor-default select-none items-center rounded-md px-3 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
