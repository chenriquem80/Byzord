// Lê a lousa das fotos de atendimento (número sequencial, placa e data) com o Claude.
// Secret necessário: ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=...)
import Anthropic from "npm:@anthropic-ai/sdk@1.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof ALLOWED_MEDIA)[number];

const SYSTEM_PROMPT = `Você analisa fotos de atendimentos de uma vidraçaria automotiva.
Em algumas fotos aparece uma lousa ou placa branca escrita à mão com até três informações:
- a data (ex: 14/11/26)
- o número do atendimento: uma sequência só de dígitos, geralmente 6 a 9 dígitos (ex: 20576401)
- a placa do veículo (ex: FCW9G54 ou ABC1234)

Regras:
- serviceNumber: somente o número do atendimento, só dígitos. Nunca a data e nunca a placa.
- plate: a placa escrita na lousa (ou, se não houver lousa, a placa do carro visível), em maiúsculas sem traço.
- date: a data escrita na lousa, como está.
- hasBoard: true se a foto mostra a lousa/placa escrita à mão.
- Se a lousa não aparecer ou um campo estiver ilegível, devolva string vazia nesse campo. Não invente números.
- confidence: "high" se leu o número com clareza, "low" se ficou em dúvida, "none" se não há número.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    hasBoard: { type: "boolean" },
    serviceNumber: { type: "string" },
    plate: { type: "string" },
    date: { type: "string" },
    confidence: { type: "string", enum: ["high", "low", "none"] },
  },
  required: ["hasBoard", "serviceNumber", "plate", "date", "confidence"],
  additionalProperties: false,
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
    // Só usuários logados no sistema podem usar a chave da Anthropic
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const caller = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await caller.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      return json({ error: "ANTHROPIC_API_KEY não configurada no Supabase." }, 500);
    }

    const { image, mediaType } = await req.json() as { image?: string; mediaType?: string };
    if (!image) return json({ error: "image (base64) é obrigatório" }, 400);
    const media: MediaType = ALLOWED_MEDIA.includes(mediaType as MediaType) ? (mediaType as MediaType) : "image/jpeg";

    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      // Se o modelo recusar por política, o próprio servidor tenta outro modelo
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: image } },
            { type: "text", text: "Extraia as informações da lousa desta foto." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return json({ hasBoard: false, serviceNumber: "", plate: "", date: "", confidence: "none", refused: true });
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "Resposta sem conteúdo" }, 502);

    const parsed = JSON.parse(text.text);
    // Mantém só dígitos no número do atendimento
    parsed.serviceNumber = String(parsed.serviceNumber ?? "").replace(/\D/g, "");
    parsed.plate = String(parsed.plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "Limite da API atingido, tente novamente." }, 429);
    if (err instanceof Anthropic.AuthenticationError) return json({ error: "ANTHROPIC_API_KEY inválida." }, 500);
    if (err instanceof Anthropic.APIError) return json({ error: `Erro da API (${err.status}): ${err.message}` }, 502);
    return json({ error: (err as Error)?.message ?? "Erro interno" }, 500);
  }
});
