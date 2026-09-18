import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

interface ActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export function ActionButton({
  children,
  icon,
  variant = "primary",
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <Button type={type} variant={variant} {...props}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </Button>
  );
}
