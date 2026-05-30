import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { products, stores } from "@/data/mock-data";
import { formatCurrency, formatMonthYear, formatPercentage } from "@/lib/format";
import { Check, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/database";
import { productSchema } from "@/lib/schemas";
import type { Product, VehicleCompatibility } from "@/types/domain";

type ProductFormValues = {
  internalCode: string;
  supplierCode: string;
  barcode: string;
  name: string;
  isTypeB: boolean;
  isTypeR: boolean;
  glassType: string;
  feature: string;
  manufacturer: string;
  brand: string;
  description: string;
  location: string;
  quantity: number;
  minimum: number;
  cost: number;
  price: number;
  lastPurchaseDate: string;
  lastSupplier: string;
  status: "ativo" | "inativo";
  notes?: string;
};

function generateUniqueBarcode(): string {
  const existing = new Set(products.map((p) => p.barcode));
  let code: string;
  do {
    code = "789" + String(Math.floor(Math.random() * 10_000_000_000)).padStart(10, "0");
  } while (existing.has(code));
  return code;
}

function getEmptyFormValues(): ProductFormValues {
  return {
    internalCode: "",
    supplierCode: "",
    barcode: generateUniqueBarcode(),
    name: "",
    isTypeB: false,
    isTypeR: false,
    glassType: "",
    feature: "",
    manufacturer: "",
    brand: "",
    description: "",
    location: "",
    quantity: 0,
    minimum: 0,
    cost: 0,
    price: 0,
    lastPurchaseDate: "",
    lastSupplier: "",
    status: "ativo",
    notes: "",
  };
}

function buildFormValues(p: Product, mfId?: string | null, storeId?: string | null): ProductFormValues {
  const mf = (mfId ? p.manufacturers.find((m) => m.id === mfId) : null) ?? p.manufacturers[0];
  const inventory = storeId
    ? (mf?.inventories.find((i) => i.storeId === storeId) ?? mf?.inventories[0])
    : mf?.inventories[0];
  return {
    internalCode: p.internalCode,
    supplierCode: p.supplierCode,
    barcode: p.barcode,
    name: p.name,
    isTypeB: (p as any).isTypeB ?? false,
    isTypeR: (p as any).isTypeR ?? false,
    glassType: p.glassType,
    feature: p.feature,
    manufacturer: mf?.manufacturer ?? "",
    brand: p.brand,
    description: p.description,
    location: inventory?.location ?? "",
    quantity: inventory?.stock ?? 0,
    minimum: inventory?.minQuantity ?? 0,
    cost: mf?.cost ?? 0,
    price: mf?.price ?? 0,
    lastPurchaseDate: mf?.lastPurchaseDate ?? "",
    lastSupplier: mf?.supplier ?? "",
    status: p.status,
    notes: p.notes,
  };
}

export function ProductsPage() {
  const { readOnly } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("id");
  const manufacturerId = searchParams.get("mf");
  const [savedMessage, setSavedMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const DEFAULT_GLASS_TYPES = ["Parabrisa", "Vigia", "Porta dianteira", "Porta traseira", "Lateral fixa", "Quebra-vento", "Teto solar"];
  const DEFAULT_FEATURES = ["Verde", "Verde sensor", "Degradê", "Degradê sensor", "Incolor", "Térmico"];
  const DEFAULT_MANUFACTURERS = ["AGC", "Pilkington", "Saint-Gobain", "Fanavid", "XYG", "Outro"];

  const [glassTypes, setGlassTypes] = useState(DEFAULT_GLASS_TYPES);
  const [showAddGlassType, setShowAddGlassType] = useState(false);
  const [newGlassType, setNewGlassType] = useState("");
  const newGlassTypeRef = useRef<HTMLInputElement>(null);
  const [showEditGlassType, setShowEditGlassType] = useState(false);
  const [editGlassTypeValue, setEditGlassTypeValue] = useState("");
  const editGlassTypeRef = useRef<HTMLInputElement>(null);

  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const newFeatureRef = useRef<HTMLInputElement>(null);

  const [manufacturers, setManufacturers] = useState(DEFAULT_MANUFACTURERS);
  const [showAddManufacturer, setShowAddManufacturer] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState("");
  const newManufacturerRef = useRef<HTMLInputElement>(null);

  const [suppliersList, setSuppliersList] = useState<string[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");
  const newSupplierRef = useRef<HTMLInputElement>(null);

  const [dbStores, setDbStores] = useState<any[]>([]);

  // Campos de estoque controlados por estado independente do react-hook-form
  const [invLocation, setInvLocation] = useState("");
  const [invQuantity, setInvQuantity] = useState(0);
  const [invMinimum, setInvMinimum] = useState(0);

  // Veículos compatíveis
  const [compatibilities, setCompatibilities] = useState<VehicleCompatibility[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    automaker: "", model: "", generation: "",
    startYear: String(new Date().getFullYear()),
    endYear: String(new Date().getFullYear()),
    version: "", note: "",
  });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({
    automaker: "", model: "", generation: "",
    startYear: "", endYear: "", version: "", note: "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);

  useEffect(() => {
    async function fetchOptions() {
      if (!supabase) return;
      const [{ data: pData }, { data: mfData }, { data: storesData }, { data: suppData }] = await Promise.all([
        supabase.from("products").select("glass_type, feature"),
        supabase.from("product_manufacturers").select("manufacturer, supplier"),
        supabase.from("stores").select("id, name, code"),
        supabase.from("suppliers").select("name"),
      ]);
      if (pData) {
        const dbTypes = pData.map((r: any) => r.glass_type).filter(Boolean);
        const dbFeatures = pData.map((r: any) => r.feature).filter(Boolean);
        setGlassTypes([...new Set([...DEFAULT_GLASS_TYPES, ...dbTypes])]);
        setFeatures([...new Set([...DEFAULT_FEATURES, ...dbFeatures])]);
      }
      if (mfData) {
        const dbMfrs = mfData.map((r: any) => r.manufacturer).filter(Boolean);
        setManufacturers([...new Set([...DEFAULT_MANUFACTURERS, ...dbMfrs])]);
        const dbSupps = mfData.map((r: any) => r.supplier).filter(Boolean);
        setSuppliersList((prev) => [...new Set([...prev, ...dbSupps])]);
      }
      if (suppData) {
        const dbSupps = suppData.map((r: any) => r.name).filter(Boolean);
        setSuppliersList((prev) => [...new Set([...prev, ...dbSupps])]);
      }
      if (storesData && storesData.length > 0) {
        setDbStores(storesData);
        setSelectedStoreId((prev) => prev || storesData[0].id);
      }
    }
    fetchOptions();
  }, []);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isEditing = currentProduct !== null;

  // Fabricante ativo: prioriza o ?mf= da URL, senão usa o primeiro
  const activeMf = currentProduct
    ? ((manufacturerId ? currentProduct.manufacturers.find((m) => m.id === manufacturerId) : null) ?? currentProduct.manufacturers[0])
    : null;

  const form = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: getEmptyFormValues(),
  });

  useEffect(() => {
    if (!productId) {
      setCurrentProduct(null);
      form.reset(getEmptyFormValues());
      return;
    }

    async function fetchProduct() {
      if (supabase) {
        // Queries separadas, igual ao stock-page, para evitar falha de nested select
        const [{ data: pData, error: pError }, { data: mfData }, { data: invData }, { data: storesData }, { data: compatData }] =
          await Promise.all([
            supabase.from("products").select("*").eq("id", productId).single(),
            supabase.from("product_manufacturers").select("*").eq("product_id", productId),
            supabase.from("product_store_inventory").select("*"),
            supabase.from("stores").select("*"),
            supabase.from("product_vehicle_compatibility").select("*, vehicles(*)").eq("product_id", productId),
          ]);

        if (pError || !pData) {
          setCurrentProduct(null);
          form.reset(getEmptyFormValues());
          return;
        }

        const storesList = storesData ?? [];
        const mfs = mfData ?? [];
        const allInvs = invData ?? [];

        const product: Product = {
          id: pData.id,
          internalCode: pData.internal_code ?? "",
          supplierCode: pData.supplier_code ?? "",
          barcode: pData.barcode ?? "",
          name: pData.name ?? "",
          glassType: pData.glass_type as Product["glassType"],
          feature: pData.feature as Product["feature"],
          brand: pData.brand ?? "",
          description: pData.description ?? "",
          photos: [],
          status: pData.status as Product["status"] ?? "ativo",
          notes: pData.notes ?? "",
          manufacturers: mfs.map((mf: any) => {
            const mfInvs = allInvs.filter(
              (inv: any) => inv.manufacturer_id === mf.id,
            );
            return {
              id: mf.id,
              manufacturer: mf.manufacturer ?? "",
              cost: mf.cost ?? mf.current_cost ?? 0,
              price: mf.price ?? mf.sale_price ?? 0,
              lastPurchaseDate: mf.last_purchase_date ?? "",
              supplier: mf.supplier ?? "",
              inventories: mfInvs.map((inv: any) => {
                const store = storesList.find((s: any) => s.id === inv.store_id);
                return {
                  id: inv.id,
                  storeId: inv.store_id,
                  storeName: store?.name ?? "",
                  location: inv.location ?? "",
                  stock: inv.stock ?? inv.stock_quantity ?? 0,
                  minQuantity: inv.min_quantity ?? inv.minimum_quantity ?? 0,
                };
              }),
            };
          }),
          compatibilities: [],
        };

        setCompatibilities(
          (compatData ?? []).map((c: any) => ({
            id: c.id,
            automaker: c.vehicles?.automaker ?? "",
            model: c.vehicles?.model ?? "",
            generation: c.vehicles?.generation ?? "",
            startYear: c.vehicles?.start_year ?? 0,
            endYear: c.vehicles?.end_year ?? 0,
            version: c.vehicles?.version ?? "",
            note: c.note ?? "",
          }))
        );

        // Inicializa a loja selecionada com a primeira loja disponível
        const firstInv = product.manufacturers.find((m) => m.id === manufacturerId)?.inventories[0]
          ?? product.manufacturers[0]?.inventories[0];
        if (firstInv?.storeId) setSelectedStoreId(firstInv.storeId);
        setInvLocation(firstInv?.location ?? "");
        setInvQuantity(firstInv?.stock ?? 0);
        setInvMinimum(firstInv?.minQuantity ?? 0);

        setCurrentProduct(product);
        form.reset(buildFormValues(product, manufacturerId, firstInv?.storeId ?? null));

        // Carrega fotos do produto
        const { data: photosData } = await supabase
          .from("product_photos")
          .select("url")
          .eq("product_id", productId);
        setPhotoUrls((photosData ?? []).map((p: any) => p.url));
      } else {
        const found = products.find((p) => p.id === productId) ?? null;
        setCurrentProduct(found);
        if (found) {
          const inv = found.manufacturers[0]?.inventories[0];
          setInvLocation(inv?.location ?? "");
          setInvQuantity(inv?.stock ?? 0);
          setInvMinimum(inv?.minQuantity ?? 0);
          form.reset(buildFormValues(found, manufacturerId));
        } else {
          form.reset(getEmptyFormValues());
        }
      }
    }

    fetchProduct();
  }, [productId, manufacturerId]);

  const watchedCost = form.watch("cost");
  const watchedPrice = form.watch("price");
  const margin = watchedCost ? ((watchedPrice - watchedCost) / watchedCost) * 100 : 0;

  const fieldLabels: Partial<Record<keyof ProductFormValues, string>> = {
    name: "Nome do produto",
    internalCode: "Código interno",
    brand: "Marca",
    glassType: "Tipo do item",
    feature: "Característica",
    manufacturer: "Fabricante",
    cost: "Preço de custo",
    price: "Preço de venda",
    lastPurchaseDate: "Última data de compra",
    lastSupplier: "Fornecedor",
  };

  function handleAddFeature() {
    const trimmed = newFeature.trim();
    if (!trimmed || features.includes(trimmed)) return;
    setFeatures((prev) => [...prev, trimmed]);
    form.setValue("feature", trimmed);
    setNewFeature("");
    setShowAddFeature(false);
  }

  function handleAddManufacturer() {
    const trimmed = newManufacturer.trim();
    if (!trimmed || manufacturers.includes(trimmed)) return;
    setManufacturers((prev) => [...prev, trimmed]);
    form.setValue("manufacturer", trimmed);
    setNewManufacturer("");
    setShowAddManufacturer(false);
  }

  function handleAddSupplier() {
    const trimmed = newSupplier.trim();
    if (!trimmed || suppliersList.includes(trimmed)) return;
    setSuppliersList((prev) => [...prev, trimmed]);
    form.setValue("lastSupplier", trimmed);
    setNewSupplier("");
    setShowAddSupplier(false);
  }

  function handleAddGlassType() {
    const trimmed = newGlassType.trim();
    if (!trimmed || glassTypes.includes(trimmed)) return;
    setGlassTypes((prev) => [...prev, trimmed]);
    form.setValue("glassType", trimmed);
    setNewGlassType("");
    setShowAddGlassType(false);
  }

  async function handleEditGlassType() {
    const oldValue = form.getValues("glassType");
    const trimmed = editGlassTypeValue.trim();
    if (!trimmed || trimmed === oldValue) { setShowEditGlassType(false); return; }
    if (supabase) {
      await supabase.from("products").update({ glass_type: trimmed }).eq("glass_type", oldValue);
    }
    setGlassTypes((prev) => prev.map((t) => (t === oldValue ? trimmed : t)));
    form.setValue("glassType", trimmed);
    setShowEditGlassType(false);
  }

  async function handleAddVehicle() {
    if (!supabase || !currentProduct || !vehicleForm.automaker.trim() || !vehicleForm.model.trim()) return;
    setAddingVehicle(true);
    try {
      const { data: newVehicle, error: vErr } = await supabase
        .from("vehicles")
        .insert({
          automaker: vehicleForm.automaker.trim(),
          model: vehicleForm.model.trim(),
          generation: vehicleForm.generation.trim(),
          start_year: Number(vehicleForm.startYear) || new Date().getFullYear(),
          end_year: Number(vehicleForm.endYear) || new Date().getFullYear(),
          version: vehicleForm.version.trim(),
        })
        .select("id")
        .single();
      if (vErr) throw vErr;

      const { data: compRow, error: cErr } = await supabase
        .from("product_vehicle_compatibility")
        .insert({ product_id: currentProduct.id, vehicle_id: newVehicle.id, note: vehicleForm.note.trim() || null })
        .select("id")
        .single();
      if (cErr) throw cErr;

      setCompatibilities((prev) => [
        ...prev,
        {
          id: compRow.id,
          automaker: vehicleForm.automaker.trim(),
          model: vehicleForm.model.trim(),
          generation: vehicleForm.generation.trim(),
          startYear: Number(vehicleForm.startYear),
          endYear: Number(vehicleForm.endYear),
          version: vehicleForm.version.trim(),
          note: vehicleForm.note.trim(),
        },
      ]);
      setVehicleForm({ automaker: "", model: "", generation: "", startYear: String(new Date().getFullYear()), endYear: String(new Date().getFullYear()), version: "", note: "" });
      setShowAddVehicle(false);
    } catch (err) {
      console.error("Erro ao adicionar veículo:", err);
    } finally {
      setAddingVehicle(false);
    }
  }

  async function handleDeleteVehicle(compatId: string) {
    if (!supabase) return;
    await supabase.from("product_vehicle_compatibility").delete().eq("id", compatId);
    setCompatibilities((prev) => prev.filter((c) => c.id !== compatId));
  }

  function startEditVehicle(item: VehicleCompatibility) {
    setEditingVehicleId(item.id);
    setEditVehicleForm({
      automaker: item.automaker,
      model: item.model,
      generation: item.generation,
      startYear: String(item.startYear),
      endYear: String(item.endYear),
      version: item.version,
      note: item.note ?? "",
    });
  }

  async function handleSaveVehicle() {
    if (!supabase || !editingVehicleId) return;
    setSavingVehicle(true);
    try {
      // Busca o vehicle_id a partir da tabela de compatibilidade
      const { data: compatRow } = await supabase
        .from("product_vehicle_compatibility")
        .select("vehicle_id")
        .eq("id", editingVehicleId)
        .single();

      if (compatRow?.vehicle_id) {
        const { error } = await supabase
          .from("vehicles")
          .update({
            automaker: editVehicleForm.automaker.trim(),
            model: editVehicleForm.model.trim(),
            generation: editVehicleForm.generation.trim(),
            start_year: Number(editVehicleForm.startYear) || new Date().getFullYear(),
            end_year: Number(editVehicleForm.endYear) || new Date().getFullYear(),
            version: editVehicleForm.version.trim(),
          })
          .eq("id", compatRow.vehicle_id);
        if (error) throw error;
      }

      // Atualiza a nota na tabela de compatibilidade
      await supabase
        .from("product_vehicle_compatibility")
        .update({ note: editVehicleForm.note.trim() || null })
        .eq("id", editingVehicleId);

      setCompatibilities((prev) =>
        prev.map((c) =>
          c.id === editingVehicleId
            ? {
                ...c,
                automaker: editVehicleForm.automaker.trim(),
                model: editVehicleForm.model.trim(),
                generation: editVehicleForm.generation.trim(),
                startYear: Number(editVehicleForm.startYear),
                endYear: Number(editVehicleForm.endYear),
                version: editVehicleForm.version.trim(),
                note: editVehicleForm.note.trim(),
              }
            : c
        )
      );
      setEditingVehicleId(null);
    } catch (err) {
      console.error("Erro ao salvar veículo:", err);
    } finally {
      setSavingVehicle(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase || !currentProduct) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${currentProduct.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("product-photos").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("product_photos").insert({ product_id: currentProduct.id, url: publicUrl });
      if (dbErr) throw dbErr;
      setPhotoUrls((prev) => [...prev, publicUrl]);
    } catch (err: any) {
      setSaveError(`Erro ao enviar foto: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleDeletePhoto(url: string) {
    if (!supabase || !currentProduct) return;
    await supabase.from("product_photos").delete().eq("url", url).eq("product_id", currentProduct.id);
    const storagePath = url.split("/product-photos/")[1];
    if (storagePath) await supabase.storage.from("product-photos").remove([storagePath]);
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  function handleValidationError(errors: FieldErrors<ProductFormValues>) {
    const missing = (Object.keys(errors) as (keyof ProductFormValues)[])
      .map((key) => fieldLabels[key] ?? key)
      .join(" • ");
    setSaveError(`Campos obrigatórios não preenchidos: ${missing}`);
  }

  async function handleSave(values: ProductFormValues) {
    setSaveError(null);

    try {
      if (supabase) {
        if (isEditing) {
          const { error } = await supabase
            .from("products")
            .update({
              internal_code: values.internalCode,
              barcode: values.barcode,
              name: values.name,
              glass_type: values.glassType,
              feature: values.feature,
              brand: values.brand,
              description: values.description ?? "",
              status: values.status,
              notes: values.notes ?? "",
            })
            .eq("id", currentProduct.id);
          if (error) { console.error("Supabase update error:", error); throw error; }

          // Atualiza fabricante: nome, custo, preço, fornecedor e data de compra
          const activeMfId = manufacturerId ?? currentProduct.manufacturers[0]?.id ?? null;
          if (activeMfId) {
            const { error: mfError } = await supabase
              .from("product_manufacturers")
              .update({
                manufacturer: values.manufacturer?.trim() || undefined,
                cost: Number(values.cost),
                price: Number(values.price),
                last_purchase_date: values.lastPurchaseDate || null,
                supplier: values.lastSupplier,
              })
              .eq("id", activeMfId);
            if (mfError) console.error("Erro ao atualizar fabricante:", mfError);
          }

          // Atualiza estoque da loja selecionada usando manufacturer_id + store_id como filtro
          const storeId = selectedStoreId || dbStores[0]?.id;
          if (storeId && activeMfId) {
            // Tenta UPDATE; se não afetar nenhuma linha, faz INSERT
            const { data: updated, error: upErr } = await supabase
              .from("product_store_inventory")
              .update({ stock: invQuantity, min_quantity: invMinimum, location: invLocation })
              .eq("manufacturer_id", activeMfId)
              .eq("store_id", storeId)
              .select("id");

            if (upErr) throw new Error(`Erro ao salvar estoque: ${upErr.message}`);

            if (!updated || updated.length === 0) {
              const { error: insErr } = await supabase
                .from("product_store_inventory")
                .insert({
                  manufacturer_id: activeMfId,
                  store_id: storeId,
                  stock: invQuantity,
                  min_quantity: invMinimum,
                  location: invLocation,
                });
              if (insErr) throw new Error(`Erro ao criar estoque: ${insErr.message}`);
            }
          }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("products")
            .insert({
              internal_code: values.internalCode,
              barcode: values.barcode,
              name: values.name,
              glass_type: values.glassType,
              feature: values.feature,
              brand: values.brand,
              description: values.description ?? "",
              status: values.status,
              notes: values.notes ?? "",
            })
            .select("id")
            .single();
          if (insertError) { console.error("Supabase insert error:", insertError); throw insertError; }

          const productDbId = inserted.id;

          try {
            const { data: mf, error: mfError } = await supabase
              .from("product_manufacturers")
              .insert({
                product_id: productDbId,
                manufacturer: values.manufacturer,
                cost: Number(values.cost),
                price: Number(values.price),
                last_purchase_date: values.lastPurchaseDate || null,
                supplier: values.lastSupplier,
              })
              .select("id")
              .single();
            if (mfError) throw mfError;

            const activeStores = dbStores.length > 0 ? dbStores : stores;
            const inventoryRows = activeStores.map((store: any, i: number) => ({
              manufacturer_id: mf.id,
              store_id: store.id,
              location: invLocation,
              stock: i === 0 ? invQuantity : 0,
              min_quantity: invMinimum,
            }));
            const { error: invError } = await supabase
              .from("product_store_inventory")
              .insert(inventoryRows);
            if (invError) throw invError;
          } catch (innerErr) {
            await supabase.from("products").delete().eq("id", productDbId);
            throw innerErr;
          }

          navigate(`/app/produtos?id=${productDbId}`);
        }
      } else {
        // Sem Supabase: salva só em memória (dados perdidos ao recarregar)
        if (isEditing) {
          const index = products.findIndex((p) => p.id === currentProduct.id);
          if (index !== -1) {
            products[index] = {
              ...products[index],
              internalCode: values.internalCode,
              barcode: values.barcode,
              name: values.name,
              glassType: values.glassType as Product["glassType"],
              feature: values.feature as Product["feature"],
              brand: values.brand,
              description: values.description,
              status: values.status,
              notes: values.notes ?? "",
            };
          }
        } else {
          const newId = `prd-${Date.now()}`;
          products.push({
            id: newId,
            internalCode: values.internalCode,
            supplierCode: "",
            barcode: values.barcode,
            name: values.name,
            glassType: values.glassType as Product["glassType"],
            feature: values.feature as Product["feature"],
            brand: values.brand,
            description: values.description,
            photos: [],
            status: values.status,
            notes: values.notes ?? "",
            manufacturers: [{
              id: `mf-${Date.now()}`,
              manufacturer: values.manufacturer,
              cost: Number(values.cost),
              price: Number(values.price),
              lastPurchaseDate: values.lastPurchaseDate,
              supplier: values.lastSupplier,
              inventories: stores.map((store, i) => ({
                id: `inv-${Date.now()}-${i}`,
                storeId: store.id,
                storeName: store.name,
                location: values.location,
                stock: i === 0 ? Number(values.quantity) : 0,
                minQuantity: Number(values.minimum),
              })),
            }],
            compatibilities: [],
          });
          navigate(`/app/produtos?id=${newId}`);
        }
      }

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err: any) {
      setSaveError(err.message ?? "Erro ao salvar produto.");
    }
  }


  return (
    <div className="space-y-6">
      {/* Dados do Produto */}
      <SectionCard
        title={isEditing ? "Editar Produto" : "Novo Produto"}
        description=""
        action={
          <div className="flex items-center gap-3">
            {savedMessage && (
              <span className="text-sm font-medium text-emerald-600">Salvo com sucesso!</span>
            )}
            {saveError && (
              <span className="text-sm font-medium text-rose-600">{saveError}</span>
            )}
            {!readOnly && (
              <Button size="lg" onClick={form.handleSubmit(handleSave as any, handleValidationError as any)}>
                Salvar produto
              </Button>
            )}
          </div>
        }
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Nome em linha completa no topo */}
          <FormField label="Nome do produto" error={form.formState.errors.name?.message} className="md:col-span-2 xl:col-span-4">
            <Input {...form.register("name")} placeholder="Ex: Parabrisa Gol G5 2008/2011" />
          </FormField>

          {/* Linha de códigos */}
          <FormField label="Código interno" error={form.formState.errors.internalCode?.message}>
            <Input {...form.register("internalCode")} />
          </FormField>
          <FormField label="Código de barras">
            <Input {...form.register("barcode")} readOnly className="bg-slate-50 text-slate-500" />
          </FormField>
          <FormField label="Marca" error={form.formState.errors.brand?.message}>
            <Input {...form.register("brand")} />
          </FormField>

          {/* Linha de classificação */}
          <FormField label="Tipo do item" error={form.formState.errors.glassType?.message}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select {...form.register("glassType")} className="flex-1">
                  <option value="">Selecione</option>
                  {glassTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => {
                    const current = form.getValues("glassType");
                    if (!current) return;
                    setEditGlassTypeValue(current);
                    setShowEditGlassType(true);
                    setShowAddGlassType(false);
                    setTimeout(() => editGlassTypeRef.current?.focus(), 50);
                  }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
                  title="Editar tipo selecionado"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddGlassType((v) => !v); setNewGlassType(""); setShowEditGlassType(false); setTimeout(() => newGlassTypeRef.current?.focus(), 50); }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
                  title="Adicionar novo tipo"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {showEditGlassType && (
                <div className="flex gap-2">
                  <Input
                    ref={editGlassTypeRef}
                    value={editGlassTypeValue}
                    onChange={(e) => setEditGlassTypeValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEditGlassType(); } if (e.key === "Escape") setShowEditGlassType(false); }}
                    placeholder="Novo nome do tipo..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleEditGlassType} disabled={!editGlassTypeValue.trim()}>
                    <Check className="size-3.5" />
                  </Button>
                  <button type="button" onClick={() => setShowEditGlassType(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                    <X className="size-4" />
                  </button>
                </div>
              )}
              {showAddGlassType && (
                <div className="flex gap-2">
                  <Input
                    ref={newGlassTypeRef}
                    value={newGlassType}
                    onChange={(e) => setNewGlassType(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGlassType(); } if (e.key === "Escape") setShowAddGlassType(false); }}
                    placeholder="Nome do novo tipo..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleAddGlassType} disabled={!newGlassType.trim()}>
                    <Check className="size-3.5" />
                  </Button>
                  <button type="button" onClick={() => setShowAddGlassType(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Característica" error={form.formState.errors.feature?.message}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select {...form.register("feature")} className="flex-1">
                  <option value="">Selecione</option>
                  {features.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => { setShowAddFeature((v) => !v); setNewFeature(""); setTimeout(() => newFeatureRef.current?.focus(), 50); }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
                  title="Adicionar nova característica"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {showAddFeature && (
                <div className="flex gap-2">
                  <Input
                    ref={newFeatureRef}
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddFeature(); } if (e.key === "Escape") setShowAddFeature(false); }}
                    placeholder="Nova característica..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleAddFeature} disabled={!newFeature.trim()}>
                    <Check className="size-3.5" />
                  </Button>
                  <button type="button" onClick={() => setShowAddFeature(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Fabricante" error={form.formState.errors.manufacturer?.message}>
            {isEditing && manufacturerId ? (
              /* Modo edição: campo de texto livre para renomear o fabricante */
              <Input
                {...form.register("manufacturer")}
                placeholder="Nome do fabricante"
                title="Edite o nome do fabricante diretamente"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select {...form.register("manufacturer")} className="flex-1">
                    <option value="">Selecione</option>
                    {manufacturers.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => { setShowAddManufacturer((v) => !v); setNewManufacturer(""); setTimeout(() => newManufacturerRef.current?.focus(), 50); }}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
                    title="Adicionar novo fabricante"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                {showAddManufacturer && (
                  <div className="flex gap-2">
                    <Input
                      ref={newManufacturerRef}
                      value={newManufacturer}
                      onChange={(e) => setNewManufacturer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddManufacturer(); } if (e.key === "Escape") setShowAddManufacturer(false); }}
                      placeholder="Novo fabricante..."
                      className="flex-1"
                    />
                    <Button type="button" size="sm" onClick={handleAddManufacturer} disabled={!newManufacturer.trim()}>
                      <Check className="size-3.5" />
                    </Button>
                    <button type="button" onClick={() => setShowAddManufacturer(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </FormField>
          <FormField label="Especial">
            <div className="flex flex-row items-center justify-center gap-4 rounded-xl border border-border bg-white px-4 py-2 shadow-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" {...form.register("isTypeB")} className="size-4 accent-primary" />
                <span className="text-sm font-semibold text-slate-700">B</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" {...form.register("isTypeR")} className="size-4 accent-primary" />
                <span className="text-sm font-semibold text-slate-700">R</span>
              </label>
            </div>
          </FormField>
        </form>
      </SectionCard>

      {/* Estoque */}
      <SectionCard
        title="Estoque"
        description=""
      >
        {isEditing && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {(dbStores.length > 0 ? dbStores : stores).map((store) => {
              // Exibe apenas o estoque do fabricante ativo para consistência com o formulário
              const inv = activeMf?.inventories.find((i) => i.storeId === store.id);
              const isSelected = selectedStoreId === store.id;

              return (
                <button
                  type="button"
                  key={store.id}
                  onClick={() => {
                    setSelectedStoreId(store.id);
                    setInvLocation(inv?.location ?? "");
                    setInvQuantity(inv?.stock ?? 0);
                    setInvMinimum(inv?.minQuantity ?? 0);
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                      : "border-border bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold ${isSelected ? "text-primary" : "text-slate-900"}`}>
                      {store.name}
                    </p>
                    {isSelected && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Editando
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Saldo atual: {inv?.stock ?? 0} un.</p>
                  <p className="text-sm text-slate-600">Mínimo sugerido: {inv?.minQuantity ?? 0} un.</p>
                  <p className="text-sm text-slate-600">
                    Localização: {inv?.location || "—"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Localização">
            <Input value={invLocation} onChange={(e) => setInvLocation(e.target.value)} />
          </FormField>
          <FormField label="Quantidade atual">
            <Input type="number" value={invQuantity} onChange={(e) => setInvQuantity(Number(e.target.value))} />
          </FormField>
          <FormField label="Quantidade mínima">
            <Input type="number" value={invMinimum} onChange={(e) => setInvMinimum(Number(e.target.value))} />
          </FormField>
          <FormField label="Status" error={form.formState.errors.status?.message}>
            <Select {...form.register("status")}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </FormField>
        </div>
      </SectionCard>

      {/* Preço */}
      <SectionCard
        title="Preço"
        description="Custos, preço de venda, margem e histórico de compra."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="Preço de custo" error={form.formState.errors.cost?.message}>
            <Input type="number" step="0.01" {...form.register("cost")} />
          </FormField>
          <FormField label="Preço de venda" error={form.formState.errors.price?.message}>
            <Input type="number" step="0.01" {...form.register("price")} />
          </FormField>
          <FormField label="Margem automática">
            <Input value={formatPercentage(margin)} disabled />
          </FormField>
          <FormField label="Última data de compra" error={form.formState.errors.lastPurchaseDate?.message}>
            <Input type="date" {...form.register("lastPurchaseDate")} />
          </FormField>
          <FormField label="Fornecedor" error={form.formState.errors.lastSupplier?.message}>
            {showAddSupplier ? (
              <div className="flex gap-2">
                <Input
                  ref={newSupplierRef}
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="Nome do fornecedor"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSupplier(); } if (e.key === "Escape") setShowAddSupplier(false); }}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddSupplier}><Check className="size-4" /></Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAddSupplier(false)}><X className="size-4" /></Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select {...form.register("lastSupplier")} className="flex-1">
                  <option value="">Selecione</option>
                  {suppliersList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddSupplier(true); setTimeout(() => newSupplierRef.current?.focus(), 50); }}>
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
          </FormField>
        </div>
      </SectionCard>

      {/* Seções apenas para produtos existentes */}
      {isEditing && (
        <>
          {/* Veículos Compatíveis */}
          <SectionCard
            title="Veículos Compatíveis"
            description="Lista de modelos e versões que utilizam este produto."
          >
            <div className="space-y-3">
              {compatibilities.map((item) =>
                editingVehicleId === item.id ? (
                  <div key={item.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="font-semibold text-slate-800">Editar veículo compatível</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <FormField label="Fabricante">
                        <Input
                          value={editVehicleForm.automaker}
                          onChange={(e) => setEditVehicleForm((f) => ({ ...f, automaker: e.target.value }))}
                          placeholder="Ex: Chevrolet"
                        />
                      </FormField>
                      <FormField label="Modelo">
                        <Input
                          value={editVehicleForm.model}
                          onChange={(e) => setEditVehicleForm((f) => ({ ...f, model: e.target.value }))}
                          placeholder="Ex: Celta"
                        />
                      </FormField>
                      <FormField label="Geração">
                        <Input
                          value={editVehicleForm.generation}
                          onChange={(e) => setEditVehicleForm((f) => ({ ...f, generation: e.target.value }))}
                          placeholder="Ex: 2001/2006"
                        />
                      </FormField>
                      <FormField label="Ano inicial">
                        <Input
                          type="number"
                          value={editVehicleForm.startYear}
                          onChange={(e) => setEditVehicleForm((f) => ({ ...f, startYear: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Ano final">
                        <Input
                          type="number"
                          value={editVehicleForm.endYear}
                          onChange={(e) => setEditVehicleForm((f) => ({ ...f, endYear: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Versão">
                        <Input
                          value={editVehicleForm.version}
                          onChange={(e) => setEditVehicleForm((f) => ({ ...f, version: e.target.value }))}
                          placeholder="Ex: 2p / 4p"
                        />
                      </FormField>
                    </div>
                    <FormField label="Observação (opcional)">
                      <Input
                        value={editVehicleForm.note}
                        onChange={(e) => setEditVehicleForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="Informação adicional"
                      />
                    </FormField>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleSaveVehicle}
                        disabled={savingVehicle || !editVehicleForm.automaker.trim() || !editVehicleForm.model.trim()}
                      >
                        {savingVehicle ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingVehicleId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.automaker} {item.model} {item.generation}
                      </p>
                      <p className="text-sm text-slate-600">
                        {item.startYear} a {item.endYear}{item.version ? ` • ${item.version}` : ""}
                      </p>
                      {item.note ? <p className="mt-1 text-sm text-slate-500">{item.note}</p> : null}
                    </div>
                    {!readOnly && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEditVehicle(item)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-500"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVehicle(item.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                          title="Remover"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}

              {showAddVehicle && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <p className="font-semibold text-slate-800">Novo veículo compatível</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Fabricante">
                      <Input
                        value={vehicleForm.automaker}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, automaker: e.target.value }))}
                        placeholder="Ex: Chevrolet"
                      />
                    </FormField>
                    <FormField label="Modelo">
                      <Input
                        value={vehicleForm.model}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                        placeholder="Ex: Celta"
                      />
                    </FormField>
                    <FormField label="Geração">
                      <Input
                        value={vehicleForm.generation}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, generation: e.target.value }))}
                        placeholder="Ex: 2001/2006"
                      />
                    </FormField>
                    <FormField label="Ano inicial">
                      <Input
                        type="number"
                        value={vehicleForm.startYear}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, startYear: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Ano final">
                      <Input
                        type="number"
                        value={vehicleForm.endYear}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, endYear: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Versão">
                      <Input
                        value={vehicleForm.version}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, version: e.target.value }))}
                        placeholder="Ex: 2p / 4p"
                      />
                    </FormField>
                  </div>
                  <FormField label="Observação (opcional)">
                    <Input
                      value={vehicleForm.note}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="Informação adicional"
                    />
                  </FormField>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAddVehicle}
                      disabled={addingVehicle || !vehicleForm.automaker.trim() || !vehicleForm.model.trim()}
                    >
                      {addingVehicle ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddVehicle(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {!readOnly && !showAddVehicle && (
                <Button type="button" variant="outline" onClick={() => setShowAddVehicle(true)}>
                  Adicionar compatibilidade
                </Button>
              )}
            </div>
          </SectionCard>

          {/* Histórico de Compras */}
          <SectionCard
            title="Histórico de Compras"
            description="Registro por fabricante com quantidades, custo e preço de venda."
          >
            <div className="space-y-3">
              {currentProduct.manufacturers.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-5">
                  <p className="font-semibold text-slate-900">{item.manufacturer}</p>
                  <p className="text-slate-600">
                    {item.inventories.reduce((sum, inventory) => sum + inventory.stock, 0)} un.
                  </p>
                  <p className="text-slate-600">{formatCurrency(item.cost)}</p>
                  <p className="text-slate-600">{formatCurrency(item.price)}</p>
                  <p className="text-slate-600">{formatMonthYear(item.lastPurchaseDate)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Fotos e Observações */}
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Fotos"
              description="Imagens do produto para referência visual."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {photoUrls.map((url) => (
                  <div key={url} className="group relative overflow-hidden rounded-2xl border border-border">
                    <img src={url} alt="Foto do produto" className="h-40 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(url)}
                      className="absolute right-2 top-2 hidden size-7 items-center justify-center rounded-full bg-rose-500 text-white group-hover:flex"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ImagePlus className="size-6 text-slate-400" />
                  {uploadingPhoto ? "Enviando..." : "Adicionar foto"}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Observações"
              description="Anotações e informações adicionais sobre o produto."
            >
              <FormField label="Observações">
                <Textarea {...form.register("notes")} className="min-h-40" />
              </FormField>
            </SectionCard>
          </div>
        </>
      )}

      {/* Observações para novo produto */}
      {!isEditing && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <FormField label="Observações">
            <Textarea {...form.register("notes")} className="min-h-40" />
          </FormField>
        </div>
      )}

      {/* Mensagem de erro visível */}
      {saveError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Erro ao salvar</p>
          <p className="mt-1 text-sm text-rose-600">{saveError}</p>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="mt-2 text-xs text-rose-400 underline hover:text-rose-600"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Botão de salvar no final da página */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div>
            {savedMessage && (
              <span className="text-sm font-medium text-emerald-600">✓ Salvo com sucesso!</span>
            )}
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={form.handleSubmit(handleSave as any, handleValidationError as any)}
          >
            {isEditing ? "Salvar alterações" : "Salvar item no estoque"}
          </Button>
        </div>
      </div>

    </div>
  );
}
