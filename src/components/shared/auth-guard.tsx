import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { SIDEBAR_PAGES, canAccessPage, type AppPage } from "@/lib/permissions";

interface AuthGuardProps {
  children: React.ReactNode;
  page?: AppPage;
}

export function AuthGuard({ children, page }: AuthGuardProps) {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (page && user && !canAccessPage(user, page)) {
    // Sem acesso à página inicial: leva para a primeira página liberada
    if (page === "/app") {
      const firstAllowed = SIDEBAR_PAGES.find((p) => p !== "/app" && canAccessPage(user, p));
      if (firstAllowed) return <Navigate to={firstAllowed} replace />;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold text-slate-900">Acesso negado</h1>
        <p className="mt-4 text-lg text-slate-600">
          Você não tem permissão para acessar esta página.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-8 rounded-2xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90"
        >
          Voltar
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
