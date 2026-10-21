import { Eye } from "lucide-react";

// Aviso exibido quando o usuário tem permissão apenas de consulta na página
export function ReadOnlyNotice() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <Eye className="size-4 shrink-0" />
      Acesso somente para consulta — você não pode incluir, alterar ou excluir nesta tela.
    </div>
  );
}
