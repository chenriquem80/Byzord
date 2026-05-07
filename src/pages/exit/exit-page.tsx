import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, X } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { currentUser, customers, products, stores } from "@/data/mock-data";
import { formatCurrency } from "@/lib/format";
import { saleSchema } from "@/lib/schemas";

type SaleFormValues = {
  storeId: string;
  productId: string;
  manufacturer: string;
  customer: string;
  customerVehicle: string;
  plate: string;
  paymentMethod: string;
  quantity: number;
  price: number;
  discount: number;
  note?: string;
};

export function ExitPage() {
  const form = useForm<SaleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      storeId: stores[0].id,
      productId: products[0].id,
      manufacturer: products[0].manufacturers[1].manufacturer,
      customer: customers[0].name,
      customerVehicle: customers[0].vehicleModel,
      plate: customers[0].plate,
      paymentMethod: "Cartão",
      quantity: 1,
      price: products[0].manufacturers[1].price,
      discount: 0,
      note: "",
    },
  });

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === form.watch("productId")) ?? products[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("productId")],
  );

  const manufacturerStock = useMemo(
    () => selectedProduct.manufacturers.find((item) => item.manufacturer === form.watch("manufacturer")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("manufacturer"), selectedProduct.manufacturers],
  );

  const selectedInventory = useMemo(
    () => manufacturerStock?.inventories.find((inventory) => inventory.storeId === form.watch("storeId")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("storeId"), manufacturerStock],
  );

  function stopScanner() {
    cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
    setScannerError(null);
    setScannedCode(null);
  }

  useEffect(() => {
    if (!scannerOpen) return;

    async function initCamera() {
      setScannerError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        if (!("BarcodeDetector" in window)) {
          setScannerError("Seu navegador não suporta leitura de código de barras. Use Chrome ou Edge.");
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"],
        });

        async function detect() {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code: string = barcodes[0].rawValue;
                setScannedCode(code);
                const found = products.find((p) => p.barcode === code);
                if (found) {
                  form.setValue("productId", found.id);
                  form.setValue("manufacturer", found.manufacturers[0].manufacturer);
                  form.setValue("price", found.manufacturers[0].price);
                  stopScanner();
                  return;
                } else {
                  setScannerError(`Código "${code}" não encontrado no cadastro.`);
                }
              }
            } catch {
              // detector error, continue
            }
          }
          animationRef.current = requestAnimationFrame(detect);
        }

        animationRef.current = requestAnimationFrame(detect);
      } catch {
        setScannerError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }

    initCamera();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [scannerOpen]);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Registrar saída"
        description="O fluxo está preparado para baixar estoque, registrar saída e gerar movimentação com log."
        action={
          selectedInventory && selectedInventory.stock > 0 ? (
            <Badge className="bg-emerald-100 text-emerald-700">
              Estoque na loja: {selectedInventory.stock}
            </Badge>
          ) : (
            <Badge className="bg-rose-100 text-rose-700">Venda bloqueada sem estoque</Badge>
          )
        }
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Loja" error={form.formState.errors.storeId?.message}>
            <Select {...form.register("storeId")}>
              {stores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Produto" error={form.formState.errors.productId?.message}>
            <div className="flex gap-2">
              <Select {...form.register("productId")} className="flex-1">
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.internalCode} • {item.name}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title="Escanear código de barras"
                className="flex shrink-0 items-center justify-center rounded-2xl border border-border bg-white px-3 text-slate-600 transition-colors hover:border-primary hover:text-primary"
              >
                <Camera className="size-5" />
              </button>
            </div>
          </FormField>

          <FormField label="Fabricante" error={form.formState.errors.manufacturer?.message}>
            <Select {...form.register("manufacturer")}>
              {selectedProduct.manufacturers.map((item) => (
                <option key={item.id} value={item.manufacturer}>
                  {item.manufacturer}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Cliente" error={form.formState.errors.customer?.message}>
            <Select {...form.register("customer")}>
              {customers.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Veículo do cliente" error={form.formState.errors.customerVehicle?.message}>
            <Input {...form.register("customerVehicle")} />
          </FormField>
          <FormField label="Placa" error={form.formState.errors.plate?.message}>
            <Input {...form.register("plate")} />
          </FormField>
          <FormField label="Forma de pagamento" error={form.formState.errors.paymentMethod?.message}>
            <Select {...form.register("paymentMethod")}>
              {["Dinheiro", "Pix", "Cartão", "Boleto"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Quantidade" error={form.formState.errors.quantity?.message}>
            <Input type="number" {...form.register("quantity")} />
          </FormField>
          <FormField label="Preço de venda" error={form.formState.errors.price?.message}>
            <Input type="number" step="0.01" {...form.register("price")} />
          </FormField>
          <FormField label="Desconto" error={form.formState.errors.discount?.message}>
            <Input type="number" step="0.01" {...form.register("discount")} />
          </FormField>
          {currentUser.allowCostView && manufacturerStock ? (
            <FormField label="Custo visível para este perfil">
              <Input disabled value={formatCurrency(manufacturerStock.cost)} />
            </FormField>
          ) : null}
          {selectedInventory ? (
            <FormField label="Localização na loja">
              <Input disabled value={selectedInventory.location} />
            </FormField>
          ) : null}
          <FormField label="Observação" className="md:col-span-2 xl:col-span-4">
            <Textarea {...form.register("note")} />
          </FormField>
          <div className="xl:col-span-4">
            <Button size="lg" disabled={!selectedInventory || selectedInventory.stock <= 0}>
              Confirmar saída
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Scanner de câmera */}
      <Dialog open={scannerOpen} onOpenChange={(open) => { if (!open) stopScanner(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5" />
              Escanear código de barras
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
              />
              {/* guia de leitura */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-64 rounded border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
            </div>

            {scannerError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{scannerError}</p>
            )}
            {scannedCode && !scannerError && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Código lido: <strong>{scannedCode}</strong>
              </p>
            )}
            {!scannerError && !scannedCode && (
              <p className="text-center text-sm text-slate-500">
                Aponte a câmera para o código de barras do produto
              </p>
            )}

            <Button variant="outline" className="w-full" onClick={stopScanner}>
              <X className="size-4" />
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
