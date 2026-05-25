export const config = { runtime: "edge" };

export default async function handler(): Promise<Response> {
  const clientId = process.env.ML_CLIENT_ID;
  if (!clientId) {
    return new Response("ML_CLIENT_ID não configurado", { status: 500 });
  }

  // Gera code_verifier aleatório (PKCE)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Gera code_challenge = BASE64URL(SHA256(code_verifier))
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Passa o code_verifier no state para o callback recuperar sem cookie
  const state = btoa(codeVerifier).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const redirectUri = "https://byzord-autovitrais.vercel.app/api/ml-callback";
  const authUrl =
    `https://auth.mercadolivre.com.br/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256` +
    `&scope=offline_access` +
    `&state=${state}`;

  return new Response(null, { status: 302, headers: { Location: authUrl } });
}
