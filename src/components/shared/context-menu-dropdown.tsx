import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onOptionsChange: (options: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ContextMenuDropdown({
  value, options, onChange, onOptionsChange,
  placeholder = "Selecione", disabled, className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; item: string; x: number; y: number }>({ visible: false, item: "", x: 0, y: 0 });
  const [editDialog, setEditDialog] = useState<{ open: boolean; original: string; value: string }>({ open: false, original: "", value: "" });
  const dropRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
      setCtxMenu((m) => ({ ...m, visible: false }));
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleAdd() {
    const trimmed = newItem.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onOptionsChange([...options, trimmed]);
    onChange(trimmed);
    setNewItem("");
    setShowAdd(false);
  }

  function handleDelete(item: string) {
    onOptionsChange(options.filter((o) => o !== item));
    if (value === item) onChange("");
    setCtxMenu((m) => ({ ...m, visible: false }));
  }

  function handleSaveEdit() {
    const trimmed = editDialog.value.trim();
    if (!trimmed) return;
    onOptionsChange(options.map((o) => (o === editDialog.original ? trimmed : o)));
    if (value === editDialog.original) onChange(trimmed);
    setEditDialog({ open: false, original: "", value: "" });
  }

  return (
    <>
      <div className={`space-y-2 ${className ?? ""}`}>
        <div className="flex gap-2">
          <div ref={dropRef} className="relative flex-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setOpen((v) => !v)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-white px-4 py-2 text-sm shadow-sm outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <span className={value ? "text-slate-900" : "text-slate-400"}>{value || placeholder}</span>
              <ChevronDown className="size-4 shrink-0 text-slate-400" />
            </button>

            {open && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
                <button type="button" className="w-full px-4 py-2 text-left text-sm text-slate-400 hover:bg-slate-50"
                  onClick={() => { onChange(""); setOpen(false); }}>
                  {placeholder}
                </button>
                {options.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ visible: true, item, x: e.clientX, y: e.clientY }); setOpen(false); }}
                    onClick={() => { onChange(item); setOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${value === item ? "bg-primary/5 font-semibold text-primary" : "text-slate-900"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={() => { setShowAdd((v) => !v); setNewItem(""); setTimeout(() => addRef.current?.focus(), 50); }}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
              title="Adicionar novo item"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>

        {showAdd && (
          <div className="flex gap-2">
            <Input
              ref={addRef}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } if (e.key === "Escape") setShowAdd(false); }}
              placeholder="Novo item..."
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={handleAdd} disabled={!newItem.trim()}>
              <Check className="size-3.5" />
            </Button>
            <button type="button" onClick={() => setShowAdd(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu.visible && (
        <div
          className="fixed z-[9999] min-w-[160px] overflow-hidden rounded-xl border border-border bg-white shadow-lg"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          <div className="border-b border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {ctxMenu.item}
          </div>
          <button type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => { setEditDialog({ open: true, original: ctxMenu.item, value: ctxMenu.item }); setCtxMenu((m) => ({ ...m, visible: false })); }}>
            <Pencil className="size-3.5" /> Editar
          </button>
          <button type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => handleDelete(ctxMenu.item)}>
            <Trash2 className="size-3.5" /> Excluir
          </button>
        </div>
      )}

      {/* Edit dialog */}
      {editDialog.open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl">
            <p className="text-base font-semibold text-slate-900">Editar item</p>
            <Input
              className="mt-3"
              value={editDialog.value}
              onChange={(e) => setEditDialog((d) => ({ ...d, value: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveEdit(); } if (e.key === "Escape") setEditDialog({ open: false, original: "", value: "" }); }}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDialog({ open: false, original: "", value: "" })}>
                <X className="size-3.5" /> Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSaveEdit} disabled={!editDialog.value.trim()}>
                <Check className="size-3.5" /> Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
