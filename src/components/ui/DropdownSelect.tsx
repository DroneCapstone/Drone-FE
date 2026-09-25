import {
  type CSSProperties,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";

import { cn } from "@/lib/utils";

export interface DropdownSelectOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  value: string;
  options: readonly (string | DropdownSelectOption)[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
}

type DropdownPalette = {
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textSecondary: string;
  muted: string;
};

const fallbackPalette: DropdownPalette = {
  surface: "#ffffff",
  surface2: "#f8f9fa",
  border: "#e2e5e9",
  text: "#202124",
  textSecondary: "#3c4043",
  muted: "#5f6368",
};

function readCssVariable(
  styles: CSSStyleDeclaration,
  variable: string,
  fallback: string,
) {
  const value = styles.getPropertyValue(variable).trim();
  return value || fallback;
}

export function DropdownSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  placeholder,
}: DropdownSelectProps) {
  const scopeRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  const [palette, setPalette] =
    useState<DropdownPalette>(fallbackPalette);

  const syncPalette = () => {
    const scope = scopeRef.current;

    if (!scope) {
      return;
    }

    const styles = window.getComputedStyle(scope);

    setPalette({
      surface: readCssVariable(
        styles,
        "--tech-surface",
        fallbackPalette.surface,
      ),
      surface2: readCssVariable(
        styles,
        "--tech-surface-2",
        fallbackPalette.surface2,
      ),
      border: readCssVariable(
        styles,
        "--tech-border",
        fallbackPalette.border,
      ),
      text: readCssVariable(
        styles,
        "--tech-text",
        fallbackPalette.text,
      ),
      textSecondary: readCssVariable(
        styles,
        "--tech-text-secondary",
        fallbackPalette.textSecondary,
      ),
      muted: readCssVariable(
        styles,
        "--tech-muted",
        fallbackPalette.muted,
      ),
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      syncPalette();
    }

    setOpen(nextOpen);
  };

  const portalStyle = {
    "--dropdown-surface": palette.surface,
    "--dropdown-surface-2": palette.surface2,
    "--dropdown-border": palette.border,
    "--dropdown-text": palette.text,
    "--dropdown-text-secondary": palette.textSecondary,
    "--dropdown-muted": palette.muted,
    backgroundColor: palette.surface,
    color: palette.text,
    borderColor: palette.border,
  } as CSSProperties;

  return (
    <span ref={scopeRef} className="contents">
      <Select
        value={value}
        onValueChange={onChange}
        open={open}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className={cn(
            `
              h-10
              w-auto
              shrink-0
              rounded-md
              !border-[var(--tech-border)]
              !bg-[var(--tech-surface-2)]
              !text-[var(--tech-text)]
              shadow-none
              outline-none
              transition-[border-color,background-color]
              duration-150
              hover:!border-orange-500/40
              focus:!border-orange-500
              focus:ring-0
              data-[state=open]:!border-orange-500
              data-[state=open]:!bg-[var(--tech-surface-2)]
              [&>svg]:hidden
            `,
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />

          <span
            className={cn(
              `
                ml-2
                inline-flex
                shrink-0
                items-center
                justify-center
                text-[var(--tech-muted)]
                transition-transform
                duration-200
                ease-out
              `,
              open
                ? "-translate-y-[1px] rotate-180"
                : "translate-y-[1px] rotate-0",
            )}
          >
            <ChevronDown
              size={17}
              strokeWidth={1.7}
            />
          </span>
        </SelectTrigger>

        <SelectContent
          sideOffset={7}
          align="start"
          style={portalStyle}
          className="
            z-[120]
            w-[var(--radix-select-trigger-width)]
            min-w-[var(--radix-select-trigger-width)]
            overflow-hidden
            rounded-md
            !border-[var(--dropdown-border)]
            !bg-[var(--dropdown-surface)]
            !text-[var(--dropdown-text)]
            shadow-xl
          "
        >
          {options.map((option) => {
            const optionValue =
              typeof option === "string"
                ? option
                : option.value;

            const optionLabel =
              typeof option === "string"
                ? option
                : option.label;

            return (
              <SelectItem
                key={optionValue}
                value={optionValue}
                className="
                  cursor-pointer
                  rounded-sm
                  px-3
                  py-2
                  text-[13px]
                  !text-[var(--dropdown-text-secondary)]
                  outline-none
                  transition-colors
                  duration-150
                  focus:!bg-[var(--dropdown-surface-2)]
                  focus:!text-orange-500
                  data-[state=checked]:!bg-transparent
                  data-[state=checked]:!text-orange-500
                "
              >
                {optionLabel}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </span>
  );
}