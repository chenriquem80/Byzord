// Operações administrativas de usuários (exigem a chave de serviço, que só existe no servidor).
// Ações: list (usuários do Auth), create (novo usuário + profile), set-password.
// Somente usuários com profile.role = ADMIN podem chamar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await caller.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "ADMIN") {
      return json({ error: "Apenas administradores podem gerenciar usuários." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "list") {
      const users: unknown[] = [];
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? "", user_metadata: u.user_metadata ?? {} })));
        if (data.users.length < 1000) break;
      }
      return json({ users });
    }

    if (action === "create") {
      const { email, password, name, role, storeId, allowCostView } = body;
      if (!email || !password || !name) return json({ error: "Nome, email e senha são obrigatórios." }, 400);
      if (String(password).length < 6) return json({ error: "A senha deve ter pelo menos 6 caracteres." }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) return json({ error: error.message }, 400);
      const { error: profileError } = await admin.from("profiles").upsert({
        id: data.user.id,
        name,
        email,
        role,
        store_id: storeId,
        allow_cost_view: !!allowCostView,
        status: "ativo",
        must_change_password: false,
      }, { onConflict: "id" });
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: profileError.message }, 400);
      }
      return json({ id: data.user.id });
    }

    if (action === "set-password") {
      const { userId, password } = body;
      if (!userId || !password) return json({ error: "userId e senha são obrigatórios." }, 400);
      if (String(password).length < 6) return json({ error: "A senha deve ter pelo menos 6 caracteres." }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (err) {
    return json({ error: (err as Error)?.message ?? "Erro interno" }, 500);
  }
});
