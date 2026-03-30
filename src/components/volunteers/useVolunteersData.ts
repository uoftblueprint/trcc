import { useState, useEffect, useCallback } from "react";
import { Volunteer, CohortRow, RoleRow } from "./types";
import {
  FilterTuple,
  getVolunteersByMultipleColumns,
} from "@/lib/api/getVolunteersByMultipleColumns";
import { getVolunteersTable } from "@/lib/api/getVolunteersTable";
import { getRoles } from "@/lib/api/getRoles";
import { getCohorts } from "@/lib/api/getCohorts";
import { useDebounce } from "@/hooks/useDebounce";
import { sortCohorts, sortRoles } from "./utils";
import { SortingState, RowSelectionState } from "@tanstack/react-table";

export const DEFAULT_OPT_IN_FILTER: FilterTuple = {
  field: "opt_in_communication",
  miniOp: "OR",
  values: ["Yes"],
};

interface UseVolunteersDataProps {
  isAdmin: boolean;
  editedRowsRef: React.RefObject<Record<number, Partial<Volunteer>>>;
}

export interface UseVolunteersDataReturn {
  data: Volunteer[];
  setData: React.Dispatch<React.SetStateAction<Volunteer[]>>;
  allVolunteers: Volunteer[];
  allRoles: RoleRow[];
  allCohorts: CohortRow[];
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  filters: FilterTuple[];
  setFilters: React.Dispatch<React.SetStateAction<FilterTuple[]>>;
  globalOp: "AND" | "OR";
  setGlobalOp: React.Dispatch<React.SetStateAction<"AND" | "OR">>;
  globalFilter: string;
  setGlobalFilter: React.Dispatch<React.SetStateAction<string>>;
  debouncedGlobalFilter: string;
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  fetchInitialData: () => Promise<void>;
  debouncedFilters: FilterTuple[];
}

export const useVolunteersData = ({
  isAdmin,
  editedRowsRef,
}: UseVolunteersDataProps): UseVolunteersDataReturn => {
  const [data, setData] = useState<Volunteer[]>([]);
  const [allVolunteers, setAllVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [allRoles, setAllRoles] = useState<RoleRow[]>([]);
  const [allCohorts, setAllCohorts] = useState<CohortRow[]>([]);

  const [filters, setFilters] = useState<FilterTuple[]>([
    DEFAULT_OPT_IN_FILTER,
  ]);
  const [globalOp, setGlobalOp] = useState<"AND" | "OR">("AND");
  const debouncedFilters = useDebounce(filters);
  const debouncedGlobalOp = useDebounce(globalOp);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

  const fetchInitialData = useCallback(async (): Promise<void> => {
    try {
      const volunteerData = await getVolunteersTable();

      const formattedAll: Volunteer[] = volunteerData.map((entry) => {
        const formatTag = (item: CohortRow | RoleRow): string => {
          if ("term" in item && "year" in item && item.term && item.year) {
            return `${item.term} ${item.year}`;
          }
          if ("name" in item && item.name) {
            return item.name;
          }
          return String(item.id) || "";
        };

        return {
          ...entry.volunteer,
          cohorts: entry.cohorts.map(formatTag).sort(sortCohorts),
          current_roles: entry.roles
            .filter((r) => r.type === "current")
            .map(formatTag)
            .sort(sortRoles),
          prior_roles: entry.roles
            .filter((r) => r.type === "prior")
            .map(formatTag)
            .sort(sortRoles),
          future_interests: entry.roles
            .filter((r) => r.type === "future_interest")
            .map(formatTag)
            .sort(sortRoles),
        };
      });

      setAllVolunteers(formattedAll);

      if (isAdmin) {
        getRoles().then(setAllRoles).catch(console.error);
        getCohorts().then(setAllCohorts).catch(console.error);
      }
    } catch (error) {
      console.error("Error fetching volunteer data:", error);
    }
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
  }, [filters, globalOp]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    let ignore = false;
    const applyFilters = async (): Promise<void> => {
      if (!allVolunteers || allVolunteers.length === 0) return;

      setGlobalFilter("");
      setSorting([]);
      setRowSelection({});

      if (debouncedFilters.length === 0) {
        setData(
          allVolunteers.map((v) =>
            editedRowsRef.current && editedRowsRef.current[v.id]
              ? { ...v, ...editedRowsRef.current[v.id] }
              : v
          )
        );
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const formattedFilters: FilterTuple[] = debouncedFilters.map((f) => {
          if (f.field === "cohorts") {
            return {
              ...f,
              values: (f.values as string[]).map((v) => {
                const [term, year] = v.split(" ");
                return [term, year] as [string, string];
              }),
            };
          }
          if (f.field === "opt_in_communication") {
            return {
              ...f,
              values: (f.values as string[]).map((v) =>
                String(v).toLowerCase() === "yes" ? "true" : "false"
              ),
            };
          }
          return f;
        });

        const filterResult = await getVolunteersByMultipleColumns(
          formattedFilters,
          debouncedGlobalOp
        );

        if (!ignore) {
          if (filterResult.error) throw new Error(filterResult.error);
          const filteredIds = new Set(filterResult.data || []);

          setData(
            allVolunteers
              .filter((v) => filteredIds.has(v.id))
              .map((v) =>
                editedRowsRef.current && editedRowsRef.current[v.id]
                  ? { ...v, ...editedRowsRef.current[v.id] }
                  : v
              )
          );
        }
      } catch (error) {
        if (!ignore) console.error("Error applying filters:", error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    applyFilters();
    return (): void => {
      ignore = true;
    };
  }, [debouncedFilters, debouncedGlobalOp, allVolunteers, editedRowsRef]);

  return {
    data,
    setData,
    allVolunteers,
    allRoles,
    allCohorts,
    loading,
    setLoading,
    filters,
    setFilters,
    globalOp,
    setGlobalOp,
    globalFilter,
    setGlobalFilter,
    debouncedGlobalFilter,
    sorting,
    setSorting,
    rowSelection,
    setRowSelection,
    fetchInitialData,
    debouncedFilters,
  };
};
