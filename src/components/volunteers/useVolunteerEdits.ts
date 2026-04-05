import { createElement, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import toast from "react-hot-toast";
import { Pencil } from "lucide-react";
import { Volunteer, RoleRow, CohortRow } from "./types";
import { updateVolunteer } from "@/lib/api/updateVolunteer";
import { createRole } from "@/lib/api/createRole";
import { createCohort } from "@/lib/api/createCohort";
import { sortCohorts, sortRoles } from "./utils";

interface UseVolunteerEditsProps {
  editedRows: Record<number, Partial<Volunteer>>;
  setEditedRows: React.Dispatch<
    React.SetStateAction<Record<number, Partial<Volunteer>>>
  >;
  allVolunteers: Volunteer[];
  allRoles: RoleRow[];
  allCohorts: CohortRow[];
  setData: React.Dispatch<React.SetStateAction<Volunteer[]>>;
  setAllVolunteers: React.Dispatch<React.SetStateAction<Volunteer[]>>;
  bumpDisplayRefresh: () => void;
  refreshRolesAndCohorts: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  /** Ref mirrored to `editedRows` for filter pipeline (useVolunteersData); cleared on cancel before display refresh. */
  syncedEditedRowsRef: React.RefObject<Record<number, Partial<Volunteer>>>;
}

interface EditStep {
  rowId: number;
  colId: string;
  value: unknown;
}

/** One undo/redo action can include one or many cell edits. */
interface HistoryAction {
  steps: EditStep[];
}

export interface UseVolunteerEditsReturn {
  isSaving: boolean;
  saveErrors: string[];
  hasEdits: boolean;
  handleCellEdit: (rowId: number, colId: string, value: unknown) => void;
  handleBulkEdit: (
    edits: Array<{ rowId: number; colId: string; value: unknown }>
  ) => void;
  handleSaveEdits: () => Promise<void>;
  handleCancelEdits: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 100;

function mergeSavedVolunteersIntoAll(
  prev: Volunteer[],
  editsSnapshot: Record<number, Partial<Volunteer>>,
  remainingEdits: Record<number, Partial<Volunteer>>
): Volunteer[] {
  const failedIds = new Set(
    Object.keys(remainingEdits).map((k) => Number.parseInt(k, 10))
  );
  return prev.map((v) => {
    if (failedIds.has(v.id) || !editsSnapshot[v.id]) {
      return v;
    }
    return { ...v, ...editsSnapshot[v.id] };
  });
}

const normalizeValue = (colId: string, value: unknown): unknown => {
  if (colId === "pronouns") {
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return String(value[0]);
    }
  }
  if (colId === "opt_in_communication") {
    if (value === "Yes") return true;
    if (value === "No") return false;
    return null;
  }
  if (colId === "cohorts" && Array.isArray(value)) {
    return [...(value as string[])].sort(sortCohorts);
  }
  if (
    ["current_roles", "prior_roles", "future_interests"].includes(colId) &&
    Array.isArray(value)
  ) {
    return [...(value as string[])].sort(sortRoles);
  }
  return value;
};

export const useVolunteerEdits = ({
  editedRows,
  setEditedRows,
  allVolunteers,
  allRoles,
  allCohorts,
  setData,
  setAllVolunteers,
  bumpDisplayRefresh,
  refreshRolesAndCohorts,
  fetchInitialData,
  syncedEditedRowsRef,
}: UseVolunteerEditsProps): UseVolunteerEditsReturn => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const hasEdits: boolean = Object.keys(editedRows).length > 0;
  const hadEditsRef = useRef(false);

  const undoStackRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  const isUndoRedoRef = useRef(false);
  const editedRowsRef = useRef(editedRows);
  editedRowsRef.current = editedRows;

  /** Mirrors stack lengths so undo/redo buttons re-render when refs change. */
  const [historyStacks, setHistoryStacks] = useState({ undo: 0, redo: 0 });

  const syncHistoryStacks = useCallback((): void => {
    setHistoryStacks({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }, []);

  const canUndo = historyStacks.undo > 0;
  const canRedo = historyStacks.redo > 0;

  const getCellValue = useCallback(
    (rowId: number, colId: string): unknown => {
      const edited = editedRowsRef.current[rowId];
      if (edited && colId in edited)
        return (edited as Record<string, unknown>)[colId];
      return allVolunteers.find((v) => v.id === rowId)?.[
        colId as keyof Volunteer
      ];
    },
    [allVolunteers]
  );

  const cellMatchesOriginal = useCallback(
    (rowId: number, colId: string, finalValue: unknown): boolean => {
      const originalRow = allVolunteers.find((v) => v.id === rowId);
      const originalValue = originalRow
        ? originalRow[colId as keyof Volunteer]
        : undefined;

      if (Array.isArray(finalValue) && Array.isArray(originalValue)) {
        return (
          JSON.stringify([...(finalValue as string[])].sort()) ===
          JSON.stringify([...(originalValue as string[])].sort())
        );
      }
      if (Array.isArray(finalValue) || Array.isArray(originalValue)) {
        return false;
      }
      const norm = (v: unknown): string =>
        v === null || v === undefined ? "" : String(v);
      return norm(finalValue) === norm(originalValue);
    },
    [allVolunteers]
  );

  /**
   * Applies many cell updates in one setEditedRows + one setData pass so multi-cell
   * operations (bulk delete, undo) never lose merges when several columns on one row change.
   */
  const applyEditsBatch = useCallback(
    (edits: Array<{ rowId: number; colId: string; value: unknown }>): void => {
      if (edits.length === 0) return;

      setEditedRows((prev) => {
        const next: Record<number, Partial<Volunteer>> = { ...prev };
        for (const { rowId, colId, value: finalValue } of edits) {
          const matchesOriginal = cellMatchesOriginal(rowId, colId, finalValue);
          if (matchesOriginal) {
            if (next[rowId]) {
              const rowObj = { ...(next[rowId] as Record<string, unknown>) };
              delete rowObj[colId];
              if (Object.keys(rowObj).length === 0) {
                delete next[rowId];
              } else {
                next[rowId] = rowObj as Partial<Volunteer>;
              }
            }
          } else {
            next[rowId] = { ...(next[rowId] || {}), [colId]: finalValue };
          }
        }

        const willHaveEdits = Object.keys(next).length > 0;
        const showTrackingToast = willHaveEdits && !hadEditsRef.current;
        hadEditsRef.current = willHaveEdits;
        if (showTrackingToast) {
          queueMicrotask((): void => {
            toast("Tracking changes — save when ready", {
              icon: createElement(Pencil, {
                className: "h-5 w-5 shrink-0 text-gray-700",
                "aria-hidden": true,
              }),
              id: "tracking-edits",
            });
          });
        }

        return next;
      });

      setData((prev) => {
        const byRow = new Map<number, Record<string, unknown>>();
        for (const { rowId, colId, value: finalValue } of edits) {
          if (!byRow.has(rowId)) byRow.set(rowId, {});
          byRow.get(rowId)![colId] = finalValue;
        }
        return prev.map((r) => {
          const patch = byRow.get(r.id);
          return patch ? ({ ...r, ...patch } as Volunteer) : r;
        });
      });
    },
    [setData, setEditedRows, cellMatchesOriginal]
  );

  const handleCellEdit = useCallback(
    (rowId: number, colId: string, value: unknown): void => {
      const finalValue = normalizeValue(colId, value);

      if (!isUndoRedoRef.current) {
        const priorValue = getCellValue(rowId, colId);
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY - 1)),
          { steps: [{ rowId, colId, value: priorValue }] },
        ];
        redoStackRef.current = [];
      }

      applyEditsBatch([{ rowId, colId, value: finalValue }]);
      syncHistoryStacks();
    },
    [getCellValue, applyEditsBatch, syncHistoryStacks]
  );

  const handleBulkEdit = useCallback(
    (edits: Array<{ rowId: number; colId: string; value: unknown }>): void => {
      if (edits.length === 0) return;

      if (!isUndoRedoRef.current) {
        const steps: EditStep[] = edits.map(({ rowId, colId }) => ({
          rowId,
          colId,
          value: getCellValue(rowId, colId),
        }));
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY - 1)),
          { steps },
        ];
        redoStackRef.current = [];
      }

      const normalized = edits.map(({ rowId, colId, value }) => ({
        rowId,
        colId,
        value: normalizeValue(colId, value),
      }));
      applyEditsBatch(normalized);

      syncHistoryStacks();
    },
    [getCellValue, applyEditsBatch, syncHistoryStacks]
  );

  const undo = useCallback((): void => {
    const action = undoStackRef.current.pop();
    if (!action) return;

    const redoSteps: EditStep[] = action.steps.map((step) => ({
      rowId: step.rowId,
      colId: step.colId,
      value: getCellValue(step.rowId, step.colId),
    }));
    redoStackRef.current.push({ steps: redoSteps });

    isUndoRedoRef.current = true;
    applyEditsBatch(
      action.steps.map((step) => ({
        rowId: step.rowId,
        colId: step.colId,
        value: step.value,
      }))
    );
    isUndoRedoRef.current = false;
    syncHistoryStacks();
  }, [getCellValue, applyEditsBatch, syncHistoryStacks]);

  const redo = useCallback((): void => {
    const action = redoStackRef.current.pop();
    if (!action) return;

    const undoSteps: EditStep[] = action.steps.map((step) => ({
      rowId: step.rowId,
      colId: step.colId,
      value: getCellValue(step.rowId, step.colId),
    }));
    undoStackRef.current.push({ steps: undoSteps });

    isUndoRedoRef.current = true;
    applyEditsBatch(
      action.steps.map((step) => ({
        rowId: step.rowId,
        colId: step.colId,
        value: step.value,
      }))
    );
    isUndoRedoRef.current = false;
    syncHistoryStacks();
  }, [getCellValue, applyEditsBatch, syncHistoryStacks]);

  const handleSaveEdits = async (): Promise<void> => {
    setIsSaving(true);
    setSaveErrors([]);
    const savingToast = toast.loading("Saving changes...");
    const currentErrors: string[] = [];
    const remainingEdits = { ...editedRows };
    const editsSnapshot = { ...editedRows };
    let referenceDataDirty = false;
    let usedFullRefetchAfterFatalError = false;

    try {
      const knownCohortTerms = new Set(
        allCohorts.map((c) => `${c.term.toLowerCase()} ${c.year}`)
      );
      const knownRoles = new Set(
        allRoles.map((r) => `${r.name.toLowerCase()}|${r.type}`)
      );

      for (const updates of Object.values(editedRows)) {
        if (updates.cohorts) {
          for (const cName of updates.cohorts) {
            const [term, year] = cName.trim().split(/\s+/);
            if (!term || !year)
              throw new Error(
                `Invalid cohort format "${cName}". Use 'Term Year'`
              );
            const normalizedTerm =
              term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
            const cohortKey = `${normalizedTerm.toLowerCase()} ${year}`;
            if (!knownCohortTerms.has(cohortKey)) {
              await createCohort({
                term: normalizedTerm,
                year: Number(year),
                is_active: true,
              });
              knownCohortTerms.add(cohortKey);
              referenceDataDirty = true;
            }
          }
        }

        const checkAndCreateRoles = async (
          roleArray: string[] | undefined,
          type: string
        ): Promise<void> => {
          if (!roleArray) return;
          for (const rName of roleArray) {
            const cleanName = rName.trim();
            const roleKey = `${cleanName.toLowerCase()}|${type}`;
            if (!knownRoles.has(roleKey)) {
              const res = await createRole({ name: cleanName, type });
              if (!res.success)
                throw new Error(
                  `Failed to create role ${cleanName}: ${res.error}`
                );
              knownRoles.add(roleKey);
              referenceDataDirty = true;
            }
          }
        };

        await checkAndCreateRoles(
          updates.current_roles as string[] | undefined,
          "current"
        );
        await checkAndCreateRoles(
          updates.prior_roles as string[] | undefined,
          "prior"
        );
        await checkAndCreateRoles(
          updates.future_interests as string[] | undefined,
          "future_interest"
        );
      }

      const results = await Promise.allSettled(
        Object.entries(editedRows).map(async ([idStr, updates]) => {
          const id = Number(idStr);
          const payload: Record<string, unknown> = { ...updates };
          const volunteer = allVolunteers.find((v) => v.id === id);

          if (!volunteer) throw new Error(`Volunteer ID ${id} not found`);

          if (updates.cohorts !== undefined) {
            payload["cohorts"] = (updates.cohorts as string[]).map(
              (cName: string) => {
                const [term, year] = cName.trim().split(/\s+/);
                const safeTerm = term || "";
                const normalizedTerm =
                  safeTerm.charAt(0).toUpperCase() +
                  safeTerm.slice(1).toLowerCase();
                return { term: normalizedTerm, year: Number(year) };
              }
            );
          }

          if (
            updates.current_roles !== undefined ||
            updates.prior_roles !== undefined ||
            updates.future_interests !== undefined
          ) {
            const mergedRoles: { name: string; type: string }[] = [];
            const appendRoles = (
              roleArray: string[] | undefined,
              fallback: string[],
              type: string
            ): void => {
              const source = roleArray !== undefined ? roleArray : fallback;
              source.forEach((rName) =>
                mergedRoles.push({ name: rName.trim(), type })
              );
            };

            appendRoles(
              updates.current_roles as string[] | undefined,
              volunteer.current_roles,
              "current"
            );
            appendRoles(
              updates.prior_roles as string[] | undefined,
              volunteer.prior_roles,
              "prior"
            );
            appendRoles(
              updates.future_interests as string[] | undefined,
              volunteer.future_interests,
              "future_interest"
            );

            payload["roles"] = mergedRoles;
            delete payload["current_roles"];
            delete payload["prior_roles"];
            delete payload["future_interests"];
          }

          if (Object.keys(payload).length > 0) {
            const res = await updateVolunteer(id, payload);
            if (res.status !== 200)
              throw new Error(
                `Failed to update ID ${id}: ${res.body?.error || "Unknown error"}`
              );
          }

          delete remainingEdits[id];
        })
      );

      results.forEach((res) => {
        if (res.status === "rejected") currentErrors.push(res.reason.message);
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "A fatal error occurred during tag creation.";
      currentErrors.push(errorMessage);
      try {
        await fetchInitialData();
        usedFullRefetchAfterFatalError = true;
      } catch (fetchErr) {
        console.error("Refetch after save failure failed:", fetchErr);
      }
    }

    setEditedRows(remainingEdits);
    syncedEditedRowsRef.current = remainingEdits;
    if (currentErrors.length > 0) setSaveErrors(currentErrors);
    else setSaveErrors([]);

    try {
      if (!usedFullRefetchAfterFatalError) {
        setAllVolunteers((prev) =>
          mergeSavedVolunteersIntoAll(prev, editsSnapshot, remainingEdits)
        );
        if (referenceDataDirty) {
          try {
            await refreshRolesAndCohorts();
          } catch (e) {
            console.error("Error refreshing roles/cohorts after save:", e);
          }
        }
      }
    } finally {
      setIsSaving(false);
      hadEditsRef.current = Object.keys(remainingEdits).length > 0;
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryStacks();

      if (currentErrors.length > 0) {
        toast.error(`${currentErrors.length} update(s) failed`, {
          id: savingToast,
        });
      } else {
        toast.success("All changes saved", { id: savingToast });
      }
    }
  };

  const handleCancelEdits = (): void => {
    flushSync(() => {
      setEditedRows({});
    });
    syncedEditedRowsRef.current = {};
    setSaveErrors([]);
    hadEditsRef.current = false;
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryStacks();
    bumpDisplayRefresh();
    toast("Changes discarded");
  };

  return {
    isSaving,
    saveErrors,
    hasEdits,
    handleCellEdit,
    handleBulkEdit,
    handleSaveEdits,
    handleCancelEdits,
    canUndo,
    canRedo,
    undo,
    redo,
  };
};
