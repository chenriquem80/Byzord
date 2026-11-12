import { useEffect, useState } from "react";
import { BookmarkPlus, FileDown, MessageCircle, Printer, RotateCcw } from "lucide-react";
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
  name: "Auto Vitrais e Acessório Byzord Ltda EPP",
  cnpj: "CNPJ: 74.650.276/0001-51",
  email: "I.E.: 688.120.457.111",
  address: ["Pq. Dr. Barbosa de Oliveira, nº 10 – Centro", "Taubaté – SP – CEP  12020-190"],
  phone: "(12) 3621-8300 - Fax: (12) 36323194  WHATS.(12)974031718",
};

const LOGO_RATIO = 227 / 482;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
}

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

function PaperInput({ value, onChange, placeholder, wide, uppercase }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
  uppercase?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(uppercase !== false ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      className={`border-b border-dashed border-transparent bg-transparent outline-none transition hover:border-slate-300 focus:border-primary/60 ${wide ? "w-[58%]" : "w-[40%]"}`}
      style={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit" }}
    />
  );
}

export function QuoteDocument() {
  const { user } = useAuth();
  const isTaubate = user?.storeName?.toLowerCase().includes("taubat") ?? false;
  const COMPANY = isTaubate ? COMPANY_TAUBATE : COMPANY_PINDA;
  const defaultCity = isTaubate ? "Taubaté" : "Pindamonhangaba";

  const [veiculo, setVeiculo] = useState("");
  const [placa, setPlaca] = useState("");
  const [item, setItem] = useState("");
  const [valor, setValor] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [date, setDate] = useState(todayIso());
  const [validDays, setValidDays] = useState(7);
  const [paymentCondition, setPaymentCondition] = useState("");
  const [agendaSaved, setAgendaSaved] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const images = useLogoImages();

  useEffect(() => { setCity(defaultCity); }, [defaultCity]);

  const dateLine = `${city}, ${formatLongDate(date)}.`;
  const footerLines = [...COMPANY.address, [user?.name, COMPANY.phone].filter(Boolean).join(" - ")];
  const validityLine = `*ORÇAMENTO VÁLIDO ATÉ ${validDays} DIA${validDays !== 1 ? "S" : ""}`;
  const paymentLine = paymentCondition.trim() ? `*CONDIÇÃO DE PAGAMENTO: ${paymentCondition.trim().toUpperCase()}` : "";

  function buildBodyText(): string {
    return [
      veiculo   ? `Veículo: ${veiculo}` : "",
      placa     ? `Placa: ${placa}` : "",
      item      ? `Item avariado: ${item}` : "",
      valor     ? `Valor: R$ ${valor}` : "",
    ].filter(Boolean).join("\n");
  }

  async function saveToAgenda() {
    if (!supabase || !user) return;
    setAgendaError(null);
    const { error } = await supabase.from("agenda").insert({
      event_date: todayIso(),
      description: `**** ORÇAMENTO ****\n${buildBodyText()}`,
      store_id: user.storeId ?? null,
      user_name: user.name ?? "",
    });
    if (error) { setAgendaError(`Erro ao salvar na agenda: ${error.message}`); return; }
    setAgendaSaved(true);
    setTimeout(() => setAgendaSaved(false), 5000);
  }

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

    const lineH = 9;
    let y = 78;
    const fields = [
      { label: "Veículo:", value: veiculo },
      { label: "Placa:", value: placa },
      { label: "Item avariado:", value: item },
    ];

    doc.setFontSize(14);
    for (const f of fields) {
      if (!f.value.trim()) continue;
      doc.setFont("times", "bold");
      const lw = doc.getTextWidth(f.label);
      doc.text(f.label, 22, y);
      doc.setFont("times", "normal");
      doc.text(` ${f.value}`, 22 + lw, y);
      y += lineH;
    }

    if (valor.trim()) {
      y += 4;
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      const lw = doc.getTextWidth("Valor: R$ ");
      doc.text("Valor: R$ ", 22, y);
      doc.text(valor, 22 + lw, y);
      y += lineH;
    }

    const dateY = Math.max(165, y + 20);
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.text(dateLine, 188, dateY, { align: "right" });

    doc.setFont("times", "bold");
    doc.setFontSize(15);
    if (paymentLine) {
      doc.text(paymentLine, 22, dateY + 22);
      doc.text(validityLine, 22, dateY + 32);
    } else {
      doc.text(validityLine, 22, dateY + 22);
    }

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

  async function handleWhatsApp() {
    saveToAgenda();
    const doc = buildPdf();
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], `orcamento-${date}.pdf`, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [pdfFile] })) {
      try { await navigator.share({ files: [pdfFile], title: "Orçamento" }); }
      catch (e) { if ((e as Error).name !== "AbortError") doc.save(`orcamento-${date}.pdf`); }
    } else {
      doc.save(`orcamento-${date}.pdf`);
      const text = [COMPANY.name, "", buildBodyText(), "", dateLine, ...(paymentLine ? [paymentLine] : []), validityLine].join("\n");
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  function handleReset() {
    setVeiculo(""); setPlaca(""); setItem(""); setValor("");
    setDate(todayIso()); setValidDays(7); setCity(defaultCity);
  }

  return (
    <SectionCard
      title="Modelo de Orçamento"
      action={
        <div className="flex flex-nowrap gap-1.5">
          <Button variant="outline" size="sm" onClick={handleReset} aria-label="Limpar">
            <RotateCcw className="size-4" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={saveToAgenda} aria-label="Salvar na agenda">
            <BookmarkPlus className="size-4" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!images} aria-label="Imprimir A4">
            <Printer className="size-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="border-green-500 text-green-600 hover:bg-green-50" aria-label="WhatsApp">
            <MessageCircle className="size-4" />
          </Button>
          <Button size="sm" onClick={handleExportPdf} disabled={!images} aria-label="Exportar PDF">
            <FileDown className="size-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      }
    >
      {agendaSaved && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">✓ Registrado na agenda do dia</p>
      )}
      {agendaError && (
        <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{agendaError}</p>
      )}

      {/* Cidade, Data, Validade, Condição de Pagamento — sempre visíveis */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <FormField label="Cidade">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </FormField>
        <FormField label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Validade (dias)">
          <Input type="number" min={1} value={validDays} onChange={(e) => setValidDays(Math.max(1, Number(e.target.value) || 1))} />
        </FormField>
        <FormField label="Condição de pagamento">
          <Input value={paymentCondition} onChange={(e) => setPaymentCondition(e.target.value)} placeholder="Ex: À vista, Pix..." />
        </FormField>
      </div>

      {/* Mobile: formulário compacto */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:hidden">
        <FormField label="Veículo">
          <Input value={veiculo} onChange={(e) => setVeiculo(e.target.value.toUpperCase())} placeholder="Modelo do veículo" className="uppercase" />
        </FormField>
        <FormField label="Placa">
          <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="AAA0A00" className="uppercase" />
        </FormField>
        <FormField label="Item avariado">
          <Input value={item} onChange={(e) => setItem(e.target.value.toUpperCase())} placeholder="Ex: PARABRISA" className="uppercase" />
        </FormField>
        <FormField label="Valor (R$)">
          <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="460,00" />
        </FormField>
      </div>

      {/* Preview A4 — com campos inline editáveis */}
      <div className="overflow-x-auto rounded-2xl bg-slate-100 p-4">
        <div
          className="relative mx-auto flex flex-col bg-white px-[83px] pb-[40px] pt-[38px] shadow-md"
          style={{ width: 794, minHeight: 1123, fontFamily: '"Times New Roman", Times, serif' }}
        >
          {/* Marca d'água */}
          <img src="/logo.png" alt="" aria-hidden
            className="pointer-events-none absolute left-1/2 top-[423px] w-[491px] -translate-x-1/2 opacity-[0.13]"
          />

          {/* Cabeçalho */}
          <div className="relative flex items-start">
            <img src="/logo.png" alt="Byzord Auto Vitrais" className="-ml-[30px] w-[159px]" />
            <div className="flex-1 text-center text-slate-500">
              <p className="text-[21px] font-bold">{COMPANY.name}</p>
              <p className="text-[15px]">{COMPANY.cnpj}</p>
              <p className="text-[15px]">{COMPANY.email}</p>
            </div>
          </div>

          <h2 className="relative mt-[60px] text-center text-[17px] font-bold">ORÇAMENTO</h2>

          {/* Campos editáveis */}
          <div className="relative mt-[40px] space-y-[10px] text-[18px] leading-relaxed">
            <p><span className="font-bold">Veículo: </span>
              <PaperInput value={veiculo} onChange={setVeiculo} placeholder="Modelo do veículo" wide />
            </p>
            <p><span className="font-bold">Placa: </span>
              <PaperInput value={placa} onChange={setPlaca} placeholder="AAA0A00" />
            </p>
            <p><span className="font-bold">Item avariado: </span>
              <PaperInput value={item} onChange={setItem} placeholder="Ex: PARABRISA" wide />
            </p>
            <p className="mt-[18px] text-[20px] font-bold">
              <span>Valor: R$ </span>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-[30%] border-b border-dashed border-transparent bg-transparent outline-none transition hover:border-slate-300 focus:border-primary/60"
                style={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit" }}
              />
            </p>
          </div>

          <p className="relative mt-[60px] text-right text-[19px]">{dateLine}</p>
          {paymentLine && <p className="relative mt-[30px] text-[20px] font-bold">{paymentLine}</p>}
          <p className={`relative ${paymentLine ? "mt-[10px]" : "mt-[30px]"} text-[20px] font-bold`}>{validityLine}</p>

          <div className="relative mt-auto pt-[40px] text-center text-[12px] leading-tight text-slate-500">
            {footerLines.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Clique nos campos dentro do orçamento para editar.</p>
    </SectionCard>
  );
}
