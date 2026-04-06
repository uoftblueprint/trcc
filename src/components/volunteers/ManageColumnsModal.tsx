"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import clsx from "clsx";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext as SortableContextBase,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

/** Bridge until @dnd-kit types align with React 19 JSX return types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SortableContext = SortableContextBase as any;
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  COLUMNS_CONFIG,
  FUNDAMENTAL_COLUMN_IDS,
  tableIdForCustomColumn,
  parseCustomColumnTableId,
  orderedColumnIds,
} from "./volunteerColumns";
import type {
  CustomColumnRow,
  NewCustomColumnInput,
} from "@/lib/api/customColumns";
import {
  createCustomColumnsAction,
  deleteCustomColumnsAction,
  saveColumnPreferencesAction,
} from "@/lib/api/actions";
import {
  ColumnChangeLogModal,
  type ColumnChangeLogEntry,
} from "./ColumnChangeLogModal";

const ID_COL = "volunteer_id";

function isFundamental(id: string): boolean {
  return (FUNDAMENTAL_COLUMN_IDS as readonly string[]).includes(id);
}

type RowMeta =
  | { kind: "builtin"; id: string; label: string }
  | {
      kind: "custom";
      id: string;
      label: string;
      columnId: number;
      dataType: string;
    };

function buildRowMetas(customColumns: CustomColumnRow[]): RowMeta[] {
  const builtInIds = COLUMNS_CONFIG.map((c) => String(c.id));
  const order = orderedColumnIds(builtInIds, customColumns, []);
  return order.map((id) => {
    const cfg = COLUMNS_CONFIG.find((c) => String(c.id) === id);
    if (cfg) {
      return { kind: "builtin" as const, id, label: cfg.label };
    }
    const key = parseCustomColumnTableId(id) ?? "";
    const cc = customColumns.find((c) => c.column_key === key);
    return {
      kind: "custom" as const,
      id,
      label: cc?.name ?? id,
      columnId: cc?.id ?? -1,
      dataType: cc?.data_type ?? "",
    };
  });
}

function SortableRow({
  meta,
  hidden,
  isAdmin,
  onToggleHidden,
  onDeleteCustom,
  disabled,
}: {
  meta: RowMeta;
  hidden: boolean;
  isAdmin: boolean;
  onToggleHidden: (id: string) => void;
  onDeleteCustom: (columnId: number) => void;
  disabled: boolean;
}): React.JSX.Element {
  const locked = meta.id === ID_COL || isFundamental(meta.id);
  const sortable = !locked && meta.id !== ID_COL;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: meta.id, disabled: !sortable || disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-2",
        isDragging && "opacity-60 shadow-md z-10"
      )}
    >
      {sortable ? (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing touch-none"
          aria-label={`Drag to reorder ${meta.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <span className="w-7 shrink-0" aria-hidden />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {meta.label}
        </p>
        <p className="text-xs text-gray-500">
          {meta.kind === "custom" ? meta.dataType : "built-in"}
        </p>
      </div>
      {!locked && (
        <button
          type="button"
          onClick={() => onToggleHidden(meta.id)}
          disabled={disabled}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          title={hidden ? "Show column" : "Hide column"}
          aria-label={hidden ? `Show ${meta.label}` : `Hide ${meta.label}`}
        >
          {hidden ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
      {isAdmin && meta.kind === "custom" && meta.columnId >= 0 && (
        <button
          type="button"
          onClick={() => onDeleteCustom(meta.columnId)}
          disabled={disabled}
          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
          title="Delete column"
          aria-label={`Delete ${meta.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface ManageColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  customColumns: CustomColumnRow[];
  columnOrder: string[];
  hiddenColumns: string[];
  /** Last save time for column prefs; used when merging saved order with custom columns. */
  prefsUpdatedAt?: string | null;
  onApplied: () => void | Promise<void>;
  /** Called after column order/visibility is saved so the parent can reload prefs into React state. */
  onPreferencesSaved?: () => void | Promise<void>;
}

export const ManageColumnsModal = ({
  isOpen,
  onClose,
  isAdmin,
  customColumns,
  columnOrder: initialOrder,
  hiddenColumns: initialHidden,
  prefsUpdatedAt = null,
  onApplied,
  onPreferencesSaved,
}: ManageColumnsModalProps): React.JSX.Element | null => {
  const [order, setOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pendingAdds, setPendingAdds] = useState<NewCustomColumnInput[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<ColumnChangeLogEntry[]>([]);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] =
    useState<NewCustomColumnInput["data_type"]>("text");
  const [tagOptionsRaw, setTagOptionsRaw] = useState("");
  const [tagMulti, setTagMulti] = useState(false);

  const customColumnIdsKey = useMemo(
    () => customColumns.map((c) => c.id).join(","),
    [customColumns]
  );

  /** Sync from parent only when the modal opens or the set of custom column ids changes — not when prefs refresh from our own persist (avoids clearing pending deletes). */
  useEffect(() => {
    if (!isOpen) return;
    const builtInIds = COLUMNS_CONFIG.map((c) => String(c.id));
    const base = orderedColumnIds(
      builtInIds,
      customColumns,
      initialOrder,
      prefsUpdatedAt
    );
    setOrder(base);
    setHidden(new Set(initialHidden));
    setPendingAdds([]);
    setPendingDeleteIds([]);
    setNewName("");
    setNewType("text");
    setTagOptionsRaw("");
    setTagMulti(false);
    setConfirmOpen(false);
    // initialOrder / initialHidden / prefsUpdatedAt intentionally omitted: read fresh when isOpen or customColumnIdsKey changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [isOpen, customColumnIdsKey]);

  const persistPrefs = useCallback(
    async (nextOrder: string[], nextHidden: Set<string>): Promise<void> => {
      setSavingPrefs(true);
      try {
        const res = await saveColumnPreferencesAction(nextOrder, [
          ...nextHidden,
        ]);
        if (!res.success) {
          toast.error(res.error ?? "Could not save column preferences");
        } else {
          await onPreferencesSaved?.();
        }
      } finally {
        setSavingPrefs(false);
      }
    },
    [onPreferencesSaved]
  );

  const handleToggleHidden = useCallback(
    (id: string): void => {
      if (isFundamental(id)) return;
      const next = new Set(hidden);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setHidden(next);
      void persistPrefs(order, next);
    },
    [hidden, order, persistPrefs]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortableIds = useMemo(
    () => order.filter((id) => id !== ID_COL),
    [order]
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    const withIdFirst = next.filter((id) => id !== ID_COL);
    const merged = [ID_COL, ...withIdFirst.filter((id) => id !== ID_COL)];
    setOrder(merged);
    void persistPrefs(merged, hidden);
  };

  const handleQueueDelete = (columnId: number): void => {
    const c = customColumns.find((x) => x.id === columnId);
    if (!c) return;
    const tid = tableIdForCustomColumn(c.column_key);
    setPendingDeleteIds((prev) =>
      prev.includes(columnId) ? prev : [...prev, columnId]
    );
    const nextOrder = order.filter((id) => id !== tid);
    const nextHidden = new Set(hidden);
    nextHidden.delete(tid);
    setOrder(nextOrder);
    setHidden(nextHidden);
    void persistPrefs(nextOrder, nextHidden);
  };

  const handleAddPending = (): void => {
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a column name");
      return;
    }
    if (newType === "tag") {
      const tag_options = tagOptionsRaw
        .split(/[,|\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      setPendingAdds((prev) => [
        ...prev,
        { name, data_type: "tag", tag_options, is_multi: tagMulti },
      ]);
    } else {
      setPendingAdds((prev) => [...prev, { name, data_type: newType }]);
    }
    setNewName("");
    setTagOptionsRaw("");
    setTagMulti(false);
    setNewType("text");
  };

  const pendingSchemaCount = pendingAdds.length + pendingDeleteIds.length;

  const runApply = async (): Promise<void> => {
    setApplying(true);
    const entries: ColumnChangeLogEntry[] = [];

    try {
      if (pendingAdds.length > 0) {
        const createRes = await createCustomColumnsAction(pendingAdds);
        for (const r of createRes) {
          const entry: ColumnChangeLogEntry = {
            description: r.success
              ? `Add column: ${r.label}`
              : `Add column failed: ${r.label}`,
            success: r.success,
          };
          if (r.error) entry.error = r.error;
          entries.push(entry);
        }
      }
      if (pendingDeleteIds.length > 0) {
        const delRes = await deleteCustomColumnsAction(pendingDeleteIds);
        for (const r of delRes) {
          const entry: ColumnChangeLogEntry = {
            description: r.success ? r.label : `Delete failed: ${r.label}`,
            success: r.success,
          };
          if (r.error) entry.error = r.error;
          entries.push(entry);
        }
      }

      setLogEntries(entries);
      setLogOpen(true);
      setPendingAdds([]);
      setPendingDeleteIds([]);
      setConfirmOpen(false);
      await onApplied();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  const metas = buildRowMetas(
    customColumns.filter((c) => !pendingDeleteIds.includes(c.id))
  );
  const metaById = new Map(metas.map((m) => [m.id, m]));
  const orderedMetas = order
    .map((id) => metaById.get(id))
    .filter((m): m is RowMeta => m !== undefined);

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-columns-title"
        onClick={() => {
          if (!savingPrefs && !applying) onClose();
        }}
      >
        <div
          className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col max-h-[min(90vh,640px)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-start justify-between gap-2">
            <div>
              <h2
                id="manage-columns-title"
                className="text-lg font-semibold text-gray-900"
              >
                Manage columns
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Reorder, show or hide columns. Visibility saves immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={savingPrefs || applying}
              className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {pendingSchemaCount > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                {pendingSchemaCount} pending schema change
                {pendingSchemaCount === 1 ? "" : "s"} — use Apply changes to
                confirm.
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedMetas.map((meta) => (
                    <SortableRow
                      key={meta.id}
                      meta={meta}
                      hidden={hidden.has(meta.id)}
                      isAdmin={isAdmin}
                      onToggleHidden={handleToggleHidden}
                      onDeleteCustom={handleQueueDelete}
                      disabled={savingPrefs || applying}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {isAdmin && (
              <div className="rounded-lg border border-gray-200 p-3 space-y-2 mt-4">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add column
                </h3>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Column name"
                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                />
                <select
                  value={newType}
                  onChange={(e) =>
                    setNewType(
                      e.target.value as NewCustomColumnInput["data_type"]
                    )
                  }
                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes / No</option>
                  <option value="tag">Tag</option>
                </select>
                {newType === "tag" && (
                  <>
                    <textarea
                      value={tagOptionsRaw}
                      onChange={(e) => setTagOptionsRaw(e.target.value)}
                      placeholder="Options (comma or newline separated)"
                      rows={2}
                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={tagMulti}
                        onChange={(e) => setTagMulti(e.target.checked)}
                      />
                      Allow multiple tags
                    </label>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleAddPending}
                  className="w-full rounded-lg bg-purple-600 text-white text-sm font-medium py-2 hover:bg-purple-700"
                >
                  Add to pending
                </button>
                {pendingAdds.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-1">
                    {pendingAdds.map((p, i) => (
                      <li key={i}>
                        + {p.name} ({p.data_type})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 shrink-0 flex flex-wrap gap-2 justify-end">
            {isAdmin && (
              <button
                type="button"
                disabled={pendingSchemaCount === 0 || applying}
                onClick={() => setConfirmOpen(true)}
                className={clsx(
                  "rounded-lg px-4 py-2 text-sm font-medium",
                  "bg-gray-900 text-white hover:bg-gray-800",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                Apply changes
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">
              Confirm schema changes
            </h3>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 max-h-48 overflow-y-auto">
              {pendingAdds.map((p, i) => (
                <li key={`a-${i}`}>
                  Add column &quot;{p.name}&quot; ({p.data_type})
                </li>
              ))}
              {pendingDeleteIds.map((id) => {
                const c = customColumns.find((x) => x.id === id);
                return (
                  <li key={`d-${id}`}>
                    Delete column &quot;{c?.name ?? id}&quot;
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300"
                onClick={() => setConfirmOpen(false)}
                disabled={applying}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
                onClick={() => void runApply()}
                disabled={applying}
              >
                {applying && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ColumnChangeLogModal
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        entries={logEntries}
      />
    </>
  );
};
