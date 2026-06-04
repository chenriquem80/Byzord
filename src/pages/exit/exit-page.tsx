import { useEffect, useMemo, useRef, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, X } from "lucide-react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
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
import { customers, products as mockProducts, stores as mockStores } from "@/data/mock-data";
import { formatCurrency } from "@/lib/format";
import { saleSchema } from "@/lib/schemas";
import { supabase } from "@/lib/database";
import type { Product } from "@/types/domain";

type SaleFormValues = {
  storeId: string;
  productId: string;
  manufacturer: string;
  productName: string;
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
  const { readOnly } = usePermissions();
  const form = useForm<SaleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      storeId: mockStores[0].id,
      productId: mockProducts[0].id,
      manufacturer: mockProducts[0].manufacturers[1].manufacturer,
      productName: "",
      customer: customers[0].name,
      customerVehicle: customers[0].vehicleModel,
      plate: customers[0].plate,
      paymentMethod: "Cartão",
      quantity: 1,
      price: mockProducts[0].manufacturers[1].price,
      discount: 0,
      note: "",
    },
  });

  const [codeQuery, setCodeQuery] = useState("");
  const [glassTypeFilter, setGlassTypeFilter] = useState("");
  const [dbProducts, setDbProducts] = useState<Product[] | null>(null);
  const [dbStores, setDbStores] = useState<typeof mockStores | null>(null);
  const [saleSpecialCond, setSaleSpecialCond] = useState<string | null>(null);

  const allProducts = useMemo(() => dbProducts ?? mockProducts, [dbProducts]);
  const allStores = useMemo(() => dbStores ?? mockStores, [dbStores]);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      const [storesResp, productsResp, mfResp, invResp, compatResp] = await Promise.all([
        supabase.from("stores").select("*"),
        supabase.from("products").select("*"),
        supabase.from("product_manufacturers").select("*"),
        supabase.from("product_store_inventory").select("*"),
        supabase.from("product_vehicle_compatibility").select("*, vehicles(*)"),
      ]);
      const stores = storesResp.data ?? [];
      const rawProducts = productsResp.data ?? [];
      const rawMf = mfResp.data ?? [];
      const rawInv = invResp.data ?? [];
      const rawCompat = compatResp.data ?? [];

      if (stores.length > 0) {
        setDbStores(stores);
        form.setValue("storeId", stores[0].id);
      }

      if (rawProducts.length > 0) {
        const mapped: Product[] = rawProducts.map((p: any) => {
          const mfs = rawMf.filter((mf: any) => mf.product_id === p.id);
          const manufacturers = mfs.map((mf: any) => {
            const mfId = mf.id;
            const invs = rawInv.filter(
              (inv: any) => inv.manufacturer_id === mfId
            );
            return {
              id: mf.id,
              manufacturer: mf.manufacturer ?? "",
              cost: mf.cost ?? mf.current_cost ?? 0,
              price: mf.price ?? mf.sale_price ?? 0,
              lastPurchaseDate: mf.last_purchase_date ?? "",
              supplier: mf.supplier ?? "",
              inventories: invs.map((inv: any) => {
                const invStore = stores.find((s: any) => s.id === inv.store_id);
                return {
                  id: inv.id,
                  storeId: inv.store_id,
                  storeName: invStore?.name ?? "",
                  location: inv.location ?? "",
                  stock: inv.stock ?? inv.stock_quantity ?? 0,
                  minQuantity: inv.min_quantity ?? inv.minimum_quantity ?? 0,
                  specialCondition: inv.special_condition ?? null,
                };
              }),
            };
          });
          return {
            id: p.id,
            internalCode: p.internal_code ?? "",
            supplierCode: "",
            barcode: p.barcode ?? "",
            name: p.name ?? "",
            glassType: p.glass_type ?? "",
            feature: p.feature ?? "",
            brand: p.brand ?? "",
            description: p.description ?? "",
            photos: [],
            status: p.status ?? "ativo",
            notes: p.notes ?? "",
            manufacturers,
            compatibilities: rawCompat
              .filter((c: any) => c.product_id === p.id)
              .map((c: any) => ({
                id: c.id,
                automaker: c.vehicles?.automaker ?? "",
                model: c.vehicles?.model ?? "",
                generation: c.vehicles?.generation ?? "",
                startYear: c.vehicles?.start_year ?? 0,
                endYear: c.vehicles?.end_year ?? 0,
                version: c.vehicles?.version ?? "",
                note: c.note ?? "",
              })),
          };
        });
        setDbProducts(mapped);
        if (mapped.length > 0 && mapped[0].manufacturers.length > 0) {
          form.setValue("productId", mapped[0].id);
          form.setValue("manufacturer", mapped[0].manufacturers[0].manufacturer);
          form.setValue("price", mapped[0].manufacturers[0].price);
        }
      }
    }
    fetchData();
  }, []);

  const searchResults = useMemo(() => {
    const terms = codeQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const seen = new Set<string>();
    return allProducts
      .filter((item) => {
        const matchesType = glassTypeFilter ? item.glassType === glassTypeFilter : true;
        if (!matchesType) return false;
        if (terms.length === 0) return true;
        const compat = item.compatibilities.map((c) => `${c.automaker} ${c.model} ${c.generation} ${c.version}`).join(" ");
        const text = `${item.internalCode} ${item.name} ${item.description} ${item.glassType} ${item.feature} ${item.brand} ${compat}`.toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .flatMap((product) =>
        product.manufacturers.map((mf) => ({
          product,
          mf,
          totalStock: mf.inventories.reduce((s, inv) => s + inv.stock, 0),
        })),
      )
      .filter((row) => {
        const key = `${row.product.id}-${row.mf.manufacturer}-${row.mf.cost}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [codeQuery, glassTypeFilter, allProducts]);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  const selectedProduct = useMemo(
    () => allProducts.find((item) => item.id === form.watch("productId")) ?? allProducts[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("productId"), allProducts],
  );

  const manufacturerStock = useMemo(
    () => selectedProduct.manufacturers.find((item) => item.manufacturer === form.watch("manufacturer")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("manufacturer"), selectedProduct.manufacturers],
  );

  const selectedInventory = useMemo(
    () => manufacturerStock?.inventories.find(
      (inv) => inv.storeId === form.watch("storeId") &&
        ((saleSpecialCond ? (inv as any).specialCondition === saleSpecialCond : !(inv as any).specialCondition))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("storeId"), manufacturerStock, saleSpecialCond],
  );

  const specialInventories = useMemo(
    () => (manufacturerStock?.inventories ?? []).filter(
      (inv) => inv.storeId === form.watch("storeId") && (inv as any).specialCondition
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("storeId"), manufacturerStock],
  );

  async function onSubmit(values: SaleFormValues) {
    if (!supabase || !selectedInventory) return;
    setSaveError(null);
    const qty = Number(values.quantity);
    const newStock = (selectedInventory.stock ?? 0) - qty;
    if (newStock < 0) {
      setSaveError("Estoque insuficiente para a quantidade informada.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("product_store_inventory")
        .update({ stock: newStock })
        .eq("id", selectedInventory.id);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      form.reset({
        storeId: values.storeId,
        productId: allProducts[0]?.id ?? "",
        manufacturer: allProducts[0]?.manufacturers[0]?.manufacturer ?? "",
        customer: values.customer,
        customerVehicle: "",
        plate: "",
        paymentMethod: values.paymentMethod,
        quantity: 1,
        price: 0,
        discount: 0,
        note: "",
      });
      // Atualiza estoque local para refletir imediatamente
      selectedInventory.stock = newStock;
    } catch (err) {
      console.error("Erro ao registrar saída:", err);
      setSaveError("Erro ao registrar saída. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function stopScanner() {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop();
      scannerControlsRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setScannerOpen(false);
    setScannerError(null);
    setScannedCode(null);
  }

  useEffect(() => {
    if (!scannerOpen) return;

    const codeReader = new BrowserMultiFormatReader();
    let active = true;
    let mediaStream: MediaStream | null = null;

    async function start() {
      if (!videoRef.current) return;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (!active || !videoRef.current) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        videoRef.current.srcObject = mediaStream;

        try {
          await videoRef.current.play();
        } catch {
          // autoPlay attribute já cuida disso na maioria dos casos
        }

        const controls = await codeReader.decodeFromVideoElement(
          videoRef.current,
          (result, _err) => {
            if (!active || !result) return;
            const code = result.getText();
            const found = allProducts.find((p) => p.barcode === code);
            if (found) {
              form.setValue("productId", found.id);
              form.setValue("manufacturer", found.manufacturers[0].manufacturer);
              form.setValue("price", found.manufacturers[0].price);
              controls.stop();
              scannerControlsRef.current = null;
              setScannerOpen(false);
            } else {
              setScannedCode(code);
              setScannerError(`Código "${code}" não encontrado no cadastro.`);
            }
          },
        );

        if (active) {
          scannerControlsRef.current = controls;
        } else {
          controls.stop();
        }
      } catch (err) {
        if (!active) return;
        const name = (err as Error)?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setScannerError("Permissão de câmera negada. Habilite-a nas configurações do navegador.");
        } else if (name === "NotFoundError") {
          setScannerError("Nenhuma câmera encontrada neste dispositivo.");
        } else {
          setScannerError("Não foi possível iniciar a câmera. Verifique as permissões.");
        }
      }
    }

    start();

    return () => {
      active = false;
      if (scannerControlsRef.current) {
        scannerControlsRef.current.stop();
        scannerControlsRef.current = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [scannerOpen]);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Busca de Produto"
        description="Filtre por nome, código ou ano para consultar o estoque em todas as lojas."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Input
            value={codeQuery}
            onChange={(e) => setCodeQuery(e.target.value)}
            placeholder="Digite o nome do produto (ex: Parabrisa Gol)"
          />
          <Select value={glassTypeFilter} onChange={(e) => setGlassTypeFilter(e.target.value)} placeholder="Todos os itens">
            {[...new Set(allProducts.map((p) => p.glassType).filter(Boolean))].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        {(codeQuery.trim() || glassTypeFilter) && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {searchResults.length} produto{searchResults.length !== 1 ? "s" : ""} encontrado{searchResults.length !== 1 ? "s" : ""}
              {searchResults.length > 0 ? " — clique para selecionar" : ""}
            </p>
            {searchResults.length > 0 && (
              <div className="divide-y divide-border">
                {searchResults.map((row, i) => (
                  <button
                    key={`${row.product.id}-${i}`}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    onClick={() => {
                      form.setValue("productId", row.product.id);
                      form.setValue("manufacturer", row.mf.manufacturer);
                      form.setValue("price", row.mf.price);
                      setCodeQuery("");
                      setGlassTypeFilter("");
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{row.product.name}</p>
                        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {row.product.feature}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {row.product.glassType} • {row.product.brand}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Fabricante: {row.mf.manufacturer} • Preço: {formatCurrency(row.mf.price)}
                      </p>
                    </div>
                    <span className={`ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${row.totalStock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {row.totalStock} un.
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Registrar saída"
        description="O fluxo está preparado para baixar estoque, registrar saída e gerar movimentação com log."
        action={
          selectedInventory && selectedInventory.stock === 0 ? (
            <Badge className="bg-rose-100 text-rose-700">Venda bloqueada sem estoque</Badge>
          ) : undefined
        }
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField label="Loja" error={form.formState.errors.storeId?.message}>
            <Select {...form.register("storeId")}>
              {allStores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="col-span-3 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-slate-700">Produto</label>
                <Select {...form.register("productId")}>
                  {allProducts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-40 shrink-0 space-y-2">
                <label className="text-sm font-medium text-slate-700">Característica</label>
                <Input disabled value={selectedProduct.feature} />
              </div>
              <div className="flex shrink-0 items-end pb-0.5">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  title="Escanear código de barras"
                  className="flex items-center justify-center rounded-2xl border border-border bg-white px-3 py-2.5 text-slate-600 transition-colors hover:border-primary hover:text-primary"
                >
                  <Camera className="size-5" />
                </button>
              </div>
            </div>
            {form.formState.errors.productId?.message && (
              <p className="text-sm text-danger">{form.formState.errors.productId.message}</p>
            )}
          </div>
          <FormField label="Fabricante" error={form.formState.errors.manufacturer?.message}>
            <Select {...form.register("manufacturer")}>
              {selectedProduct.manufacturers.map((item) => (
                <option key={item.id} value={item.manufacturer}>
                  {item.manufacturer}
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
          {specialInventories.length > 0 && (
            <FormField label="Condição especial">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setSaleSpecialCond(null)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${!saleSpecialCond ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  Regular
                </button>
                {specialInventories.map((inv) => (
                  <button
                    key={(inv as any).specialCondition}
                    type="button"
                    onClick={() => setSaleSpecialCond((inv as any).specialCondition)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${saleSpecialCond === (inv as any).specialCondition ? "bg-sky-600 text-white" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}
                  >
                    {(inv as any).specialCondition} ({inv.stock} un.)
                  </button>
                ))}
              </div>
            </FormField>
          )}
          <FormField label="Observação" className="md:col-span-2 xl:col-span-4">
            <Textarea {...form.register("note")} />
          </FormField>
          {saveSuccess && (
            <div className="xl:col-span-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Saída registrada com sucesso!
            </div>
          )}
          {saveError && (
            <div className="xl:col-span-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {saveError}
            </div>
          )}
          {!readOnly && (
            <div className="xl:col-span-4">
              <Button
                type="submit"
                size="lg"
                disabled={saving || !selectedInventory || selectedInventory.stock <= 0}
              >
                {saving ? "Registrando..." : "Confirmar saída"}
              </Button>
            </div>
          )}
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
