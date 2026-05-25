export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return new Response(JSON.stringify({ error: "Missing q" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = process.env.ML_ACCESS_TOKEN ?? "";

  // Passa token como query param (formato que funciona para apps não certificados)
  const mlUrl =
    `https://api.mercadolibre.com/sites/MLB/search` +
    `?q=${encodeURIComponent(q)}&limit=6&sort=price_asc` +
    (accessToken ? `&access_token=${accessToken}` : "");

  try {
    const mlRes = await fetch(mlUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Authorization": accessToken ? `Bearer ${accessToken}` : "",
      },
    });

    if (!mlRes.ok) {
      const body = await mlRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `ML ${mlRes.status}: ${body.slice(0, 200)}` }),
        { status: mlRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await mlRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
