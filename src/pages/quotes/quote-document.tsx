import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, FileDown, MessageCircle, Printer, RotateCcw } from "lucide-react";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import { supabase } from "@/lib/database";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

const COMPANY_PINDA = {
  name: "Byzord comércio de vidros automotivos",
  cnpj: "CNPJ: 09.270.241/0001-25",
  email: "E-mail: cibele_byzord@hotmail.com",
  address: ["Av. José Humberto Gomes Filho, 1825, Campo alegre, 12412-390.", "Pindamonhangaba/SP"],
  phone: "(12)3648.9126",
};

const COMPANY_TAUBATE = {
  name: "Auto Vitrais e Acessórios Byzord Ltda EPP",
  cnpj: "CNPJ: 74.650.276/0001-51",
  email: "I.E.: 688.120.457.111",
  address: ["Pq. Dr. Barbosa de Oliveira, nº 10 – Centro", "Taubaté – SP – CEP  12020-190"],
  phone: "(12) 3621-8300 - Fax: (12) 36323194  WHATS.(12)974031718",
};

const DEFAULT_BODY = "Veículo:            Placa: \n\nItem avariado: \n\n\nValor: R$ ";

const LOGO_RATIO = 227 / 482; // altura / largura de /logo.png

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
}

// Carrega o logo como data URL: normal (cabeçalho) e esmaecido (marca d'água)
function useLogoImages() {
  const [images, setImages] = useState<{ logo: string; watermark: string } | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const logo = canvas.toDataURL("image/png");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.13;
      ctx.drawImage(img, 0, 0);
      setImages({ logo, watermark: canvas.toDataURL("image/png") });
    };
    img.src = "/logo.png";
  }, []);
  return images;
}

export function QuoteDocument() {
  const { user } = useAuth();
  const isTaubate = user?.storeName?.toLowerCase().includes("taubat") ?? false;
  const COMPANY = isTaubate ? COMPANY_TAUBATE : COMPANY_PINDA;
  const defaultCity = isTaubate ? "Taubaté" : "Pindamonhangaba";

  const location = useLocation();
  const [body, setBody] = useState(DEFAULT_BODY);

  useEffect(() => {
    const stateBody = (location.state as { body?: string } | null)?.body;
    if (stateBody) setBody(stateBody);
  }, [location.key]);
  const [city, setCity] = useState(defaultCity);
  const [date, setDate] = useState(todayIso());
  const [validDays, setValidDays] = useState(7);
  const [agendaSaved, setAgendaSaved] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const images = useLogoImages();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function saveToAgenda() {
    if (!supabase || !user) return;
    setAgendaError(null);
    const { data, error } = await supabase.from("agenda").insert({
      event_date: todayIso(),
      description: `**** ORÇAMENTO ****\n${body.trim()}`,
      store_id: user.storeId ?? null,
      user_name: user.name ?? "",
    }).select("id").single();
    if (error) {
      setAgendaError(`Erro ao salvar na agenda: ${error.message}`);
      console.error("saveToAgenda:", error);
      return;
    }
    console.log("Agenda salva:", data?.id);
    setAgendaSaved(true);
    setTimeout(() => setAgendaSaved(false), 5000);
  }

  useEffect(() => { setCity(defaultCity); }, [defaultCity]);

  // Textarea cresce conforme o texto, como numa folha
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  const dateLine = `${city}, ${formatLongDate(date)}.`;
  // Rodapé: endereço e, na última linha, o usuário que emitiu antes do telefone da loja
  const footerLines = [...COMPANY.address, [user?.name, COMPANY.phone].filter(Boolean).join(" - ")];
  const validityLine = `*ORÇAMENTO VÁLIDO ATÉ ${validDays} DIA${validDays !== 1 ? "S" : ""}`;

  function buildPdf(): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;

    if (images) {
      const wmW = 130;
      doc.addImage(images.watermark, "PNG", (pageW - wmW) / 2, 112, wmW, wmW * LOGO_RATIO);
      doc.addImage(images.logo, "PNG", 14, 10, 42, 42 * LOGO_RATIO);
    }

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(120);
    doc.text(COMPANY.name, 128, 17, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(COMPANY.cnpj, 128, 23, { align: "center" });
    doc.text(COMPANY.email, 128, 28, { align: "center" });

    doc.setTextColor(0);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("ORÇAMENTO", pageW / 2, 58, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    const lineH = 7.2;
    const lines = doc.splitTextToSize(body, 166) as string[];
    let y = 78;
    for (const line of lines) {
      doc.text(line, 22, y);
      y += lineH;
    }

    const dateY = Math.max(165, y + 14);
    doc.text(dateLine, 188, dateY, { align: "right" });

    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.text(validityLine, 22, dateY + 22);

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    footerLines.forEach((line, i) => doc.text(line, pageW / 2, 276 + i * 4.5, { align: "center" }));

    return doc;
  }

  function handleExportPdf() {
    buildPdf().save(`orcamento-${date}.pdf`);
    saveToAgenda();
  }

  function handlePrint() {
    const doc = buildPdf();
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
    saveToAgenda();
  }

  function handleWhatsApp() {
    const text = [COMPANY.name, "", body.trim(), "", dateLine, validityLine].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    saveToAgenda();
  }

  function handleReset() {
    setBody(DEFAULT_BODY);
    setDate(todayIso());
    setValidDays(7);
    setCity(defaultCity);
  }

  return (
    <SectionCard
      title="Modelo de Orçamento"
      action={
        <div className="flex flex-nowrap gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4" />
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={saveToAgenda} aria-label="Salvar na agenda">
            <BookmarkPlus className="size-4" />
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!images}>
            <Printer className="size-4" />
            Imprimir (A4)
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="border-green-500 text-green-600 hover:bg-green-50" aria-label="Enviar pelo WhatsApp">
            <MessageCircle className="size-4" />
          </Button>
          <Button size="sm" onClick={handleExportPdf} disabled={!images}>
            <FileDown className="size-4" />
            Exportar PDF
          </Button>
        </div>
      }
    >
      {agendaSaved && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 font-medium">✓ Registrado na agenda do dia</p>
      )}
      {agendaError && (
        <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{agendaError}</p>
      )}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <FormField label="Cidade">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </FormField>
        <FormField label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Validade (dias)">
          <Input type="number" min={1} value={validDays} onChange={(e) => setValidDays(Math.max(1, Number(e.target.value) || 1))} />
        </FormField>
      </div>

      {/* Pré-visualização da folha A4 (794 x 1123 px ≈ 210 x 297 mm) */}
      <div className="overflow-x-auto rounded-2xl bg-slate-100 p-4">
        <div
          className="relative mx-auto flex flex-col bg-white px-[83px] pb-[40px] pt-[38px] shadow-md"
          style={{ width: 794, minHeight: 1123, fontFamily: '"Times New Roman", Times, serif' }}
        >
          <img
            src="/logo.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[423px] w-[491px] -translate-x-1/2 opacity-[0.13]"
          />

          <div className="relative flex items-start">
            <img src="/logo.png" alt="Byzord Auto Vitrais" className="-ml-[30px] w-[159px]" />
            <div className="flex-1 text-center text-slate-500">
              <p className="text-[21px] font-bold">{COMPANY.name}</p>
              <p className="text-[15px]">{COMPANY.cnpj}</p>
              <p className="text-[15px]">{COMPANY.email}</p>
            </div>
          </div>

          <h2 className="relative mt-[60px] text-center text-[17px] font-bold">ORÇAMENTO</h2>

          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck
            className="relative mt-[40px] w-full resize-none overflow-hidden rounded-md border border-dashed border-transparent bg-transparent p-0 text-[19px] leading-[1.45] text-black outline-none transition hover:border-slate-300 focus:border-primary/60"
            style={{ fontFamily: "inherit" }}
          />

          <p className="relative mt-[60px] text-right text-[19px]">{dateLine}</p>
          <p className="relative mt-[60px] text-[20px] font-bold">{validityLine}</p>

          <div className="relative mt-auto pt-[40px] text-center text-[12px] leading-tight text-slate-500">
            {footerLines.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Clique no texto da folha para editar.</p>
    </SectionCard>
  );
}
