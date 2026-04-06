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
import {
  GripVertical,
  Eye,
  EyeOff,
  Plus,
  Loader2,
  ListOrdered,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  COLUMNS_CONFIG,
  FUNDAMENTAL_COLUMN_IDS,
  parseCustomColumnTableId,
  orderedColumnIds,
} from "./volunteerColumns";
import type {
  CustomColumnRow,
  NewCustomColumnInput,
} from "@/lib/api/customColumns";
import {
  createCustomColumnsAction,
  saveColumnPreferencesAction,
} from "@/lib/api/actions";
import {
  ColumnChangeLogModal,
  type ColumnChangeLogEntry,
} from "./ColumnChangeLogModal";
import { NON_HIDEABLE_COLUMN_IDS } from "@/lib/volunteerTable/columnVisibility";

const ID_COL = "volunteer_id";

function computeLayoutKey(order: string[], hidden: Set<string>): string {
  return JSON.stringify({
    order,
    hidden: [...hidden].sort(),
  });
}

type BusyOp = "idle" | "savingLayout" | "applyingAdds";

const NON_HIDEABLE = new Set(NON_HIDEABLE_COLUMN_IDS);

function isNonHideableColumn(id: string): boolean {
  return NON_HIDEABLE.has(id);
}

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
  orgHidden,
  onToggleHidden,
  disabled,
}: {
  meta: RowMeta;
  hidden: boolean;
  orgHidden: boolean;
  onToggleHidden: (id: string) => void;
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
        "flex min-w-0 items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-2",
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
        <p className="text-xs text-gray-500 line-clamp-2 wrap-break-word">
          {meta.kind === "custom" ? meta.dataType : "built-in"}
          {orgHidden ? " · Hidden for all users" : ""}
        </p>
      </div>
      {!isNonHideableColumn(meta.id) && (!locked || orgHidden) && (
        <button
          type="button"
          onClick={() => {
            if (!orgHidden && !locked) onToggleHidden(meta.id);
          }}
          disabled={disabled || orgHidden || locked}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          title={
            orgHidden
              ? "Hidden for all users in Settings → Volunteers table"
              : hidden
                ? "Show column"
                : "Hide column"
          }
          aria-label={
            orgHidden
              ? `${meta.label} hidden for all users`
              : hidden
                ? `Show ${meta.label}`
                : `Hide ${meta.label}`
          }
        >
          {hidden ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
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
  /** Column ids hidden for everyone via Settings → Table Management. */
  globalHiddenColumnIds?: string[];
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
  globalHiddenColumnIds = [],
  onApplied,
  onPreferencesSaved,
}: ManageColumnsModalProps): React.JSX.Element | null => {
  const [order, setOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pendingAdds, setPendingAdds] = useState<NewCustomColumnInput[]>([]);
  const [busyOp, setBusyOp] = useState<BusyOp>("idle");
  const [layoutSavedKey, setLayoutSavedKey] = useState("");
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<ColumnChangeLogEntry[]>([]);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] =
    useState<NewCustomColumnInput["data_type"]>("text");
  const [tagOptionsRaw, setTagOptionsRaw] = useState("");
  const [tagMulti, setTagMulti] = useState(false);
  const [orderSectionOpen, setOrderSectionOpen] = useState(true);
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  const customColumnIdsKey = useMemo(
    () => customColumns.map((c) => c.id).join(","),
    [customColumns]
  );

  const globalHiddenSet = useMemo(
    () => new Set(globalHiddenColumnIds),
    [globalHiddenColumnIds]
  );

  /** Sync from parent only when the modal opens or the set of custom column ids changes — not when prefs refresh from our own persist. */
  useEffect(() => {
    if (!isOpen) return;
    const builtInIds = COLUMNS_CONFIG.map((c) => String(c.id));
    const base = isAdmin
      ? orderedColumnIds(
          builtInIds,
          customColumns,
          initialOrder,
          prefsUpdatedAt
        )
      : initialOrder;
    setOrder(base);
    const h = new Set(initialHidden);
    setHidden(h);
    setLayoutSavedKey(computeLayoutKey(base, h));
    setPendingAdds([]);
    setNewName("");
    setNewType("text");
    setTagOptionsRaw("");
    setTagMulti(false);
    setConfirmAddOpen(false);
    setOrderSectionOpen(true);
    setAddSectionOpen(false);
    // initialOrder / initialHidden / prefsUpdatedAt intentionally omitted: read fresh when isOpen or customColumnIdsKey changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [isOpen, customColumnIdsKey, isAdmin]);

  const handleSaveLayout = useCallback(async (): Promise<void> => {
    setBusyOp("savingLayout");
    try {
      const res = await saveColumnPreferencesAction(order, [...hidden]);
      if (!res.success) {
        toast.error(res.error ?? "Could not save column preferences");
        return;
      }
      setLayoutSavedKey(computeLayoutKey(order, hidden));
      await onPreferencesSaved?.();
      toast.success("Column layout saved");
    } finally {
      setBusyOp("idle");
    }
  }, [order, hidden, onPreferencesSaved]);

  const handleToggleHidden = useCallback(
    (id: string): void => {
      if (isNonHideableColumn(id)) return;
      if (isFundamental(id)) return;
      const next = new Set(hidden);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setHidden(next);
    },
    [hidden]
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

  const layoutDirty = useMemo(
    () =>
      layoutSavedKey !== "" &&
      computeLayoutKey(order, hidden) !== layoutSavedKey,
    [order, hidden, layoutSavedKey]
  );

  const busy = busyOp !== "idle";

  const runApplyAdds = async (): Promise<void> => {
    if (pendingAdds.length === 0) return;
    setBusyOp("applyingAdds");
    setConfirmAddOpen(false);
    const entries: ColumnChangeLogEntry[] = [];
    try {
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
      setLogEntries(entries);
      setLogOpen(true);
      setPendingAdds([]);
      await onApplied();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusyOp("idle");
    }
  };

  if (!isOpen) return null;

  const metas = buildRowMetas(customColumns);
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
          if (!busy) onClose();
        }}
      >
        <div
          className="flex w-full max-w-xl min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl max-h-[min(92vh,820px)]"
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
                {isAdmin
                  ? "Reorder and show or hide columns, or add new custom fields. To remove a custom column permanently, use Settings → Volunteers table."
                  : "Drag to reorder columns and change which ones you see."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Close
            </button>
          </div>

          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden px-4 py-4">
            <section
              className={clsx(
                "rounded-xl border border-gray-200 bg-slate-50/90 min-w-0 flex flex-col min-h-0 overflow-hidden p-3",
                orderSectionOpen && "flex-1"
              )}
              aria-labelledby="manage-columns-order-heading"
            >
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-lg -m-0.5 p-1.5 text-left hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                onClick={() => setOrderSectionOpen((o) => !o)}
                aria-expanded={orderSectionOpen}
                aria-controls="manage-columns-order-panel"
                id="manage-columns-order-heading"
              >
                <ChevronDown
                  className={clsx(
                    "h-5 w-5 shrink-0 text-slate-500 transition-transform mt-0.5",
                    !orderSectionOpen && "-rotate-90"
                  )}
                  aria-hidden
                />
                <ListOrdered
                  className="h-5 w-5 text-slate-500 shrink-0 mt-0.5"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Column order & visibility
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-snug">
                    Drag rows to reorder. Use the eye icon to show or hide
                    columns for your account. Click{" "}
                    <span className="font-medium">Save column layout</span> when
                    you are ready to persist order and visibility.
                  </p>
                </div>
              </button>
              {orderSectionOpen && (
                <div
                  id="manage-columns-order-panel"
                  className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col gap-3"
                >
                  <div className="min-h-48 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5">
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
                              hidden={
                                hidden.has(meta.id) ||
                                globalHiddenSet.has(meta.id)
                              }
                              orgHidden={globalHiddenSet.has(meta.id)}
                              onToggleHidden={handleToggleHidden}
                              disabled={busy}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end shrink-0 border-t border-gray-200/80 pt-3">
                    <button
                      type="button"
                      onClick={() => void handleSaveLayout()}
                      disabled={!layoutDirty || busy}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busyOp === "savingLayout" && (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      )}
                      Save column layout
                    </button>
                  </div>
                </div>
              )}
            </section>

            {isAdmin && (
              <section
                className="shrink-0 rounded-xl border border-dashed border-purple-200 bg-purple-50/50 p-3 min-w-0 flex flex-col overflow-hidden max-h-[min(48vh,26rem)]"
                aria-labelledby="manage-columns-add-heading"
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-lg -m-0.5 p-1.5 text-left hover:bg-purple-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1"
                  onClick={() => setAddSectionOpen((o) => !o)}
                  aria-expanded={addSectionOpen}
                  aria-controls="manage-columns-add-panel"
                  id="manage-columns-add-heading"
                >
                  <ChevronDown
                    className={clsx(
                      "h-5 w-5 shrink-0 text-purple-600 transition-transform mt-0.5",
                      !addSectionOpen && "-rotate-90"
                    )}
                    aria-hidden
                  />
                  <Plus
                    className="h-5 w-5 text-purple-600 shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Add a custom column
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-snug">
                      Add fields to the pending list, then use{" "}
                      <span className="font-medium">Create columns</span> to add
                      them to the database (not just your view).
                    </p>
                  </div>
                </button>
                {addSectionOpen && (
                  <div
                    id="manage-columns-add-panel"
                    className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-purple-100 pt-3"
                  >
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="manage-columns-new-name"
                          className="mb-1 block text-xs font-medium text-gray-700"
                        >
                          Column name
                        </label>
                        <input
                          id="manage-columns-new-name"
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          disabled={busy}
                          placeholder="e.g. T-shirt size"
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="manage-columns-new-type"
                          className="mb-1 block text-xs font-medium text-gray-700"
                        >
                          Data type
                        </label>
                        <select
                          id="manage-columns-new-type"
                          value={newType}
                          onChange={(e) =>
                            setNewType(
                              e.target
                                .value as NewCustomColumnInput["data_type"]
                            )
                          }
                          disabled={busy}
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Yes / No</option>
                          <option value="tag">Tag</option>
                        </select>
                      </div>
                      {newType === "tag" && (
                        <>
                          <div>
                            <label
                              htmlFor="manage-columns-tag-options"
                              className="mb-1 block text-xs font-medium text-gray-700"
                            >
                              Tag options (optional)
                            </label>
                            <textarea
                              id="manage-columns-tag-options"
                              value={tagOptionsRaw}
                              onChange={(e) => setTagOptionsRaw(e.target.value)}
                              disabled={busy}
                              placeholder="Comma or newline separated"
                              rows={2}
                              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={tagMulti}
                              disabled={busy}
                              onChange={(e) => setTagMulti(e.target.checked)}
                            />
                            Allow multiple tags
                          </label>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleAddPending}
                        disabled={busy}
                        className="w-full rounded-lg bg-purple-600 text-white text-sm font-medium py-2 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add to pending list
                      </button>
                      {pendingAdds.length > 0 && (
                        <ul className="text-xs text-gray-600 space-y-1 border-t border-purple-100 pt-2">
                          {pendingAdds.map((p, i) => (
                            <li key={i}>
                              + {p.name} ({p.data_type})
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmAddOpen(true)}
                        disabled={pendingAdds.length === 0 || busy}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-purple-700 bg-white px-3 py-2 text-sm font-medium text-purple-900 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {busyOp === "applyingAdds" && (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        )}
                        Create columns
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {confirmAddOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Create new columns</h3>
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              These columns will be added to the database and will appear in the
              volunteers table for <span className="font-medium">every</span>{" "}
              signed-in user (admins and staff), not only for you.
            </p>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 max-h-48 overflow-y-auto">
              {pendingAdds.map((p, i) => (
                <li key={`a-${i}`}>
                  Add column &quot;{p.name}&quot; ({p.data_type})
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300"
                onClick={() => setConfirmAddOpen(false)}
                disabled={busyOp === "applyingAdds"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white disabled:opacity-50 inline-flex items-center gap-2 hover:bg-purple-700"
                onClick={() => void runApplyAdds()}
                disabled={busyOp === "applyingAdds"}
              >
                {busyOp === "applyingAdds" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Create columns
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
