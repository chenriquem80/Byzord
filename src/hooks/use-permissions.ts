import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { canAccessPage, canEditPage, type AppPage } from "@/lib/permissions";

export function usePermissions() {
  const { user } = useAuth();
  const location = useLocation();

  const currentPage = location.pathname as AppPage;

  function canEdit(page?: AppPage): boolean {
    if (!user) return false;
    return canEditPage(user.role, page ?? currentPage);
  }

  function canAccess(page?: AppPage): boolean {
    if (!user) return false;
    return canAccessPage(user.role, page ?? currentPage);
  }

  const readOnly = !canEdit();

  return { canEdit, canAccess, readOnly };
}
