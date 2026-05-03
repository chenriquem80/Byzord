import { supabase } from "./database";

export async function logActivity(
  action: string,
  tableName: string,
  recordId?: string,
  payload?: any
) {
  try {
    const { data: { session } } = await supabase!.auth.getSession();
    
    if (!session) return;

    const { error } = await supabase!
      .from("audit_logs")
      .insert({
        user_id: session.user.id,
        action,
        table_name: tableName,
        record_id: recordId,
        payload: payload || {},
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (err) {
    console.error("Erro ao registrar log de auditoria:", err);
  }
}
