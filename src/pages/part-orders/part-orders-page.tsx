import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/shared/section-card";
import { ReadOnlyNotice } from "@/components/shared/read-only-notice";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/lib/database";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";

type PartOrder = {
  id: string;
  order_date: string;
  arrival_date: string | null;
  description: string;
  store_id: string | null;
  user_name: string | null;
  created_at: string;
};

type Store = { id: string; name: string };

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })
    .format(new Date(value)).replace(",", "");
}

export function PartOrdersPage() {
  const { user: authUser } = useAuth();
  const storeId = authUser?.storeId ?? null;
  const isAdmin = authUser?.role === "ADMIN";
  const { readOnly } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const [orderDate, setOrderDate] = useState(todayIso());
  const [arrivalDate, setArrivalDate] = useState("");
  const [description, setDescription] = useState("");
  const [formStoreId, setFormStoreId] = useState(storeId ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin && supabase) {
      supabase.from("stores").select("id, name").order("name")
        .then(({ data }) => setStores(data ?? []));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!formStoreId) setFormStoreId(storeId ?? stores[0]?.id ?? "");
  }, [storeId, stores]);

  async function fetchOrders() {
    setLoading(true);
    if (!supabase || (!storeId && !isAdmin)) { setOrders([]); setLoading(false); return; }
    let query = supabase
      .from("part_orders")
      .select("id, order_date, arrival_date, description, store_id, user_name, created_at")
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("store_id", storeId);
    const { data, error: fetchErr } = await query;
    if (fetchErr) setError(`Erro ao carregar: ${fetchErr.message}`);
    setOrders((data ?? []) as PartOrder[]);
    setLoading(false);
  }

  useEffect(() => { fetchOrders(); }, [storeId, isAdmin]);

  // Quando vier da agenda, pré-preenche o formulário com o registro correspondente
  useEffect(() => {
    const state = location.state as { editDescription?: string; editArrivalDate?: string; editOrderDate?: string } | null;
    if (!state?.editDescription) return;
    navigate(location.pathname, { replace: true, state: null });
    // Tenta encontrar o registro pelo texto da descrição
    if (orders.length > 0) {
      const match = orders.find((o) => o.description.trim() === state.editDescription!.trim());
      if (match) { startEdit(match); return; }
    }
    // Não encontrou — pré-preenche o formulário como novo mas com os dados
    setDescription(state.editDescription);
    if (state.editArrivalDate) setArrivalDate(state.editArrivalDate);
    if (state.editOrderDate) setOrderDate(state.editOrderDate);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.key, orders]);

  function resetForm() {
    setDescription("");
    setOrderDate(todayIso());
    setArrivalDate("");
    setEditingId(null);
    setFormStoreId(storeId ?? stores[0]?.id ?? "");
  }

  function startEdit(order: PartOrder) {
    setEditingId(order.id);
    setOrderDate(order.order_date);
    setArrivalDate(order.arrival_date ?? "");
    setDescription(order.description);
    if (order.store_id) setFormStoreId(order.store_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    setError(null);
    if (!description.trim()) { setError("Informe a descrição."); return; }
    if (!orderDate) { setError("Informe a data do pedido."); return; }
    if (!supabase) { setError("Banco de dados não configurado."); return; }
    if (!formStoreId) { setError(isAdmin ? "Selecione a unidade." : "Usuário sem unidade vinculada."); return; }

    setSaving(true);
    const payload = {
      order_date: orderDate,
      arrival_date: arrivalDate || null,
      description: description.trim(),
      store_id: formStoreId,
    };
    const { error: saveErr } = editingId
      ? await supabase.from("part_orders").update(payload).eq("id", editingId)
      : await supabase.from("part_orders").insert({ ...payload, user_name: authUser?.name ?? "" });
    setSaving(false);
    if (saveErr) { setError(`Erro ao salvar: ${saveErr.message}`); return; }

    if (!editingId) {
      const arrivalLine = arrivalDate ? `\nPrevisão de chegada: ${formatDate(arrivalDate)}` : "";
      await supabase.from("agenda").insert({
        event_date: orderDate,
        description: `**** ENCOMENDA ****\n${description.trim()}${arrivalLine}`,
        store_id: formStoreId,
        user_name: authUser?.name ?? "",
      });
    }

    resetForm();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
    fetchOrders();
  }

  async function handleDelete(order: PartOrder) {
    if (!supabase) return;
    if (!window.confirm("Excluir esta encomenda?")) return;
    const { error: delErr } = await supabase.from("part_orders").delete().eq("id", order.id);
    if (delErr) { setError(`Erro ao excluir: ${delErr.message}`); return; }
    if (editingId === order.id) resetForm();
    fetchOrders();
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={editingId ? "Editar encomenda" : "Encomenda de Peça"}
        description={isAdmin ? "Administrador — acesso a todas as unidades" : `Unidade: ${authUser?.storeName ?? ""}`}
        action={savedMessage ? <span className="text-sm font-medium text-emerald-600">Salvo com sucesso!</span> : null}
      >
        <div className="space-y-4">
          {readOnly && <ReadOnlyNotice />}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Data do pedido">
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </FormField>
            <FormField label="Previsão de chegada">
              <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
            </FormField>
            {isAdmin && (
              <FormField label="Unidade" className="sm:col-span-2 lg:col-span-2">
                <Select value={formStoreId} onChange={(e) => setFormStoreId(e.target.value)} placeholder="Selecione...">
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
            )}
          </div>
          {!readOnly && (
            <>
              <FormField label="Descrição">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.toUpperCase())}
                  placeholder="Descreva a peça encomendada..."
                  className="min-h-28 uppercase"
                />
              </FormField>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar"}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm} disabled={saving}>Cancelar</Button>
                )}
              </div>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Encomendas registradas"
        description={`${orders.length} encomenda${orders.length !== 1 ? "s" : ""} registrada${orders.length !== 1 ? "s" : ""}.`}
      >
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma encomenda registrada.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                    <CalendarDays className="size-4 text-primary" />
                    Pedido: {formatDate(order.order_date)}
                    {order.arrival_date && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Previsão: {formatDate(order.arrival_date)}
                      </span>
                    )}
                    {isAdmin && order.store_id && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {stores.find((s) => s.id === order.store_id)?.name ?? order.store_id}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!readOnly && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(order)} aria-label="Editar">
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(order)} aria-label="Excluir">
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm uppercase text-slate-700">{order.description}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Registrado{order.user_name ? ` por ${order.user_name}` : ""} em {formatDateTime(order.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
