export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const make = searchParams.get("make");
  const model = searchParams.get("model");

  if (!year || !make || !model) {
    return new Response(JSON.stringify({ error: "year, make e model são obrigatórios" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = process.env.VITE_CARAPI_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "Token não configurado" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const params = new URLSearchParams({ year, make, model });
  const upstream = await fetch(`https://carapi.app/api/exterior-colors/v2?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
