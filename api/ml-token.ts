export const config = { runtime: "edge" };

export default async function handler(): Promise<Response> {
  const token = process.env.ML_ACCESS_TOKEN ?? "";
  return new Response(JSON.stringify({ token }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
