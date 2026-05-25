export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return html(`<h2 style="color:red">Erro de autorização: ${error}</h2><p><a href="/api/ml-auth">Tentar novamente</a></p>`);
  }
  if (!code) {
    return html(`<h2 style="color:red">Código de autorização não encontrado.</h2><p><a href="/api/ml-auth">Tentar novamente</a></p>`);
  }
  if (!state) {
    return html(`<h2 style="color:red">State ausente. <a href="/api/ml-auth">Clique aqui para tentar novamente.</a></h2>`);
  }

  // Recupera o code_verifier do state
  let codeVerifier: string;
  try {
    codeVerifier = atob(state.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return html(`<h2 style="color:red">State inválido. <a href="/api/ml-auth">Clique aqui para tentar novamente.</a></h2>`);
  }

  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const redirectUri = "https://byzord-autovitrais.vercel.app/api/ml-callback";

  if (!clientId || !clientSecret) {
    return html(`<h2 style="color:red">ML_CLIENT_ID ou ML_CLIENT_SECRET não configurados no Vercel.</h2>`);
  }

  const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    return html(`<h2 style="color:red">Erro ao obter token: ${JSON.stringify(tokenData)}</h2><p><a href="/api/ml-auth">Tentar novamente</a></p>`);
  }

  const { access_token, refresh_token } = tokenData;
  const mainToken = refresh_token ?? access_token ?? "";
  const tokenLabel = refresh_token ? "ML_REFRESH_TOKEN" : "ML_ACCESS_TOKEN";

  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>ML Auth OK</title>
<style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px}
code{background:#f1f5f9;padding:6px 10px;border-radius:6px;word-break:break-all;display:block;margin:8px 0;font-size:12px}
.box{background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:16px 0}
.raw{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0}
button{margin-top:8px;padding:8px 16px;border-radius:8px;border:none;background:#16a34a;color:#fff;cursor:pointer;font-size:14px}
</style></head><body>
<h1>✅ Autorização concluída!</h1>
<p>Copie o token abaixo e envie para o assistente:</p>
<div class="box">
  <strong>${tokenLabel}:</strong>
  <code id="t">${mainToken}</code>
  <button onclick="navigator.clipboard.writeText(document.getElementById('t').innerText).then(()=>this.textContent='Copiado!')">Copiar token</button>
</div>
<div class="raw">
  <strong>Resposta completa do ML (debug):</strong>
  <code>${JSON.stringify(tokenData, null, 2)}</code>
</div>
</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function html(body: string): Response {
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px">${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
