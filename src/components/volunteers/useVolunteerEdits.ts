import { useState, useCallback } from "react";
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

export interface UseVolunteerEditsReturn {
  isSaving: boolean;
  saveErrors: string[];
  hasEdits: boolean;
  handleCellEdit: (rowId: number, colId: string, value: unknown) => void;
  handleSaveEdits: () => Promise<void>;
  handleCancelEdits: () => Promise<void>;
}

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

  const handleCellEdit = useCallback(
    (rowId: number, colId: string, value: unknown): void => {
      let finalValue = value;

      if (colId === "opt_in_communication") {
        if (value === "Yes") finalValue = true;
        else if (value === "No") finalValue = false;
        else finalValue = null;
      } else if (colId === "cohorts" && Array.isArray(value)) {
        finalValue = [...(value as string[])].sort(sortCohorts);
      } else if (
        ["current_roles", "prior_roles", "future_interests"].includes(colId) &&
        Array.isArray(value)
      ) {
        finalValue = [...(value as string[])].sort(sortRoles);
      }

      setEditedRows((prev) => ({
        ...prev,
        [rowId]: { ...(prev[rowId] || {}), [colId]: finalValue },
      }));

      setData((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, [colId]: finalValue } : r))
      );
    },
    [setData, setEditedRows]
  );

  const handleSaveEdits = async (): Promise<void> => {
    setIsSaving(true);
    setLoading(true);
    setSaveErrors([]);
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
  };

  const handleCancelEdits = async (): Promise<void> => {
    setLoading(true);
    setEditedRows({});
    setSaveErrors([]);
    await fetchInitialData();
  };

  return {
    isSaving,
    saveErrors,
    hasEdits,
    handleCellEdit,
    handleSaveEdits,
    handleCancelEdits,
  };
};
