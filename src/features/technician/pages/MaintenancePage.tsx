import { Navigate } from "react-router-dom";

export function MaintenancePage() {
  return (
    <Navigate
      to="/technician/maintenance/alerts"
      replace
    />
  );
}