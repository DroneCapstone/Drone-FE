import type { ComponentProps } from "react";
import { DialogContent } from "../../../components/ui/Dialog";

/**
 * Admin-only Radix dialog wrapper. Dialog portals do not inherit AdminLayout
 * typography, so scope the Admin font scale on the portalled content itself.
 */
export function AdminDialogContent({ className, ...props }: ComponentProps<typeof DialogContent>) {
  return <DialogContent {...props} className={["admin-dialog-typography", className].filter(Boolean).join(" ")} />;
}
