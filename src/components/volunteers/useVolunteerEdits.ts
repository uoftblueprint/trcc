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

    const results = await Promise.allSettled(
      Object.entries(editedRows).map(async ([idStr, updates]) => {
        const id = Number(idStr);
        const payload: Record<string, unknown> = { ...updates };
        const volunteer = allVolunteers.find((v) => v.id === id);

        if (!volunteer) throw new Error(`Volunteer ID ${id} not found`);
        const volunteerName = volunteer.name_org || `ID ${id}`;

        if (updates.cohorts !== undefined) {
          const knownTerms = allCohorts.map((c) => `${c.term} ${c.year}`);
          for (const cName of updates.cohorts) {
            if (!knownTerms.includes(cName)) {
              const [term, year] = cName.split(" ");
              if (!term || !year)
                throw new Error(
                  `Invalid cohort format "${cName}". Use 'Term Year'`
                );
              try {
                await createCohort({
                  term,
                  year: Number(year),
                  is_active: true,
                });
              } catch (e: unknown) {
                const errMsg = e instanceof Error ? e.message : String(e);
                throw new Error(`Failed to create cohort ${cName}: ${errMsg}`);
              }
            }
          }
          payload["cohorts"] = (updates.cohorts as string[]).map(
            (cName: string) => {
              const [term, year] = cName.split(" ");
              return { term, year: Number(year) };
            }
          );
        }

        if (
          updates.current_roles !== undefined ||
          updates.prior_roles !== undefined ||
          updates.future_interests !== undefined
        ) {
          const currentRoles =
            updates.current_roles !== undefined
              ? (updates.current_roles as string[])
              : volunteer.current_roles;
          const priorRoles =
            updates.prior_roles !== undefined
              ? (updates.prior_roles as string[])
              : volunteer.prior_roles;
          const futureInterests =
            updates.future_interests !== undefined
              ? (updates.future_interests as string[])
              : volunteer.future_interests;

          const mergedRoles: { name: string; type: string }[] = [];

          const processRoles = async (
            roleArray: string[],
            type: "current" | "prior" | "future_interest"
          ): Promise<void> => {
            const knownRoles = allRoles
              .filter((r) => r.type === type)
              .map((r) => r.name);
            for (const rName of roleArray) {
              if (!knownRoles.includes(rName)) {
                const roleRes = await createRole({ name: rName, type });
                if (!roleRes.success)
                  throw new Error(
                    `Failed to create role ${rName}: ${roleRes.error}`
                  );
              }
              mergedRoles.push({ name: rName, type });
            }
          };

          await processRoles(currentRoles, "current");
          await processRoles(priorRoles, "prior");
          await processRoles(futureInterests, "future_interest");

          payload["roles"] = mergedRoles;
          delete payload["current_roles"];
          delete payload["prior_roles"];
          delete payload["future_interests"];
        }

        if (Object.keys(payload).length > 0) {
          const res = await updateVolunteer(id, payload);
          if (res.status !== 200)
            throw new Error(
              `Failed to update ${volunteerName}: ${res.body?.error || "Unknown error"}`
            );
        }

        delete remainingEdits[id];
      })
    );

    results.forEach((res) => {
      if (res.status === "rejected") currentErrors.push(res.reason.message);
    });

    setEditedRows(remainingEdits);
    if (currentErrors.length > 0) {
      setSaveErrors(currentErrors);
    } else {
      setSaveErrors([]);
    }

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
