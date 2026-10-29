export const config = { runtime: "edge" };

// Converte para Title Case: "HONDA HR-V" → "Honda Hr-V"
function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const year  = searchParams.get("year")?.trim() ?? "";
  const make  = toTitleCase(searchParams.get("make")?.trim() ?? "");
  const model = toTitleCase(searchParams.get("model")?.trim() ?? "");

  if (!year || !make || !model) {
    return new Response(JSON.stringify({ error: "year, make e model são obrigatórios" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = process.env.VITE_CARAPI_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "Token não configurado no servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const params = new URLSearchParams({ year, make, model });
  const upstream = await fetch(`https://carapi.app/api/exterior-colors/v2?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await upstream.text();

  if (!upstream.ok) {
    // Retorna detalhes do erro da carapi.app para facilitar diagnóstico
    return new Response(
      JSON.stringify({ error: `carapi.app retornou ${upstream.status}`, detail: body, params: { year, make, model } }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
