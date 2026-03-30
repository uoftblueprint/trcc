import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
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
  setLoading: (l: boolean) => void;
  fetchInitialData: () => Promise<void>;
}

/** Single history step: set this cell to `value` when applied (undo or redo). */
interface EditAction {
  rowId: number;
  colId: string;
  value: unknown;
}

export interface UseVolunteerEditsReturn {
  isSaving: boolean;
  saveErrors: string[];
  hasEdits: boolean;
  handleCellEdit: (rowId: number, colId: string, value: unknown) => void;
  handleSaveEdits: () => Promise<void>;
  handleCancelEdits: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 100;

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
  setLoading,
  fetchInitialData,
}: UseVolunteerEditsProps): UseVolunteerEditsReturn => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const hasEdits: boolean = Object.keys(editedRows).length > 0;
  const hadEditsRef = useRef(false);

  const undoStackRef = useRef<EditAction[]>([]);
  const redoStackRef = useRef<EditAction[]>([]);
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

  const applyEdit = useCallback(
    (rowId: number, colId: string, finalValue: unknown): void => {
      const originalRow = allVolunteers.find((v) => v.id === rowId);
      const originalValue = originalRow
        ? originalRow[colId as keyof Volunteer]
        : undefined;

      let matchesOriginal = false;
      if (Array.isArray(finalValue) && Array.isArray(originalValue)) {
        matchesOriginal =
          JSON.stringify([...(finalValue as string[])].sort()) ===
          JSON.stringify([...(originalValue as string[])].sort());
      } else if (Array.isArray(finalValue) || Array.isArray(originalValue)) {
        matchesOriginal = false;
      } else {
        const norm = (v: unknown): string =>
          v === null || v === undefined ? "" : String(v);
        matchesOriginal = norm(finalValue) === norm(originalValue);
      }

      setEditedRows((prev) => {
        const next = { ...prev };
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

        const willHaveEdits = Object.keys(next).length > 0;
        const showTrackingToast = willHaveEdits && !hadEditsRef.current;
        hadEditsRef.current = willHaveEdits;
        if (showTrackingToast) {
          queueMicrotask((): void => {
            toast("Tracking changes — save when ready", {
              icon: "✏️",
              id: "tracking-edits",
            });
          });
        }

        return next;
      });

      setData((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, [colId]: finalValue } : r))
      );
    },
    [setData, setEditedRows, allVolunteers]
  );

  const handleCellEdit = useCallback(
    (rowId: number, colId: string, value: unknown): void => {
      const finalValue = normalizeValue(colId, value);

      if (!isUndoRedoRef.current) {
        const priorValue = getCellValue(rowId, colId);
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY - 1)),
          { rowId, colId, value: priorValue },
        ];
        redoStackRef.current = [];
      }

      applyEdit(rowId, colId, finalValue);
      syncHistoryStacks();
    },
    [getCellValue, applyEdit, syncHistoryStacks]
  );

  const undo = useCallback((): void => {
    const action = undoStackRef.current.pop();
    if (!action) return;

    const valueBeforeUndo = getCellValue(action.rowId, action.colId);
    redoStackRef.current.push({
      rowId: action.rowId,
      colId: action.colId,
      value: valueBeforeUndo,
    });

    isUndoRedoRef.current = true;
    applyEdit(action.rowId, action.colId, action.value);
    isUndoRedoRef.current = false;
    syncHistoryStacks();
  }, [getCellValue, applyEdit, syncHistoryStacks]);

  const redo = useCallback((): void => {
    const action = redoStackRef.current.pop();
    if (!action) return;

    const valueBeforeRedo = getCellValue(action.rowId, action.colId);
    undoStackRef.current.push({
      rowId: action.rowId,
      colId: action.colId,
      value: valueBeforeRedo,
    });

    isUndoRedoRef.current = true;
    applyEdit(action.rowId, action.colId, action.value);
    isUndoRedoRef.current = false;
    syncHistoryStacks();
  }, [getCellValue, applyEdit, syncHistoryStacks]);

  const handleSaveEdits = async (): Promise<void> => {
    setIsSaving(true);
    setLoading(true);
    setSaveErrors([]);
    const savingToast = toast.loading("Saving changes...");
    const currentErrors: string[] = [];
    const remainingEdits = { ...editedRows };

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
    }

    setEditedRows(remainingEdits);
    if (currentErrors.length > 0) setSaveErrors(currentErrors);
    else setSaveErrors([]);

    await fetchInitialData();
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
  };

  const handleCancelEdits = async (): Promise<void> => {
    setLoading(true);
    setEditedRows({});
    setSaveErrors([]);
    hadEditsRef.current = false;
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryStacks();
    toast("Changes discarded", { icon: "↩️" });
    await fetchInitialData();
  };

  return {
    isSaving,
    saveErrors,
    hasEdits,
    handleCellEdit,
    handleSaveEdits,
    handleCancelEdits,
    canUndo,
    canRedo,
    undo,
    redo,
  };
};
