"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import clsx from "clsx";
import type { Volunteer, CohortRow, RoleRow } from "./types";
import { useCellSelection } from "./useCellSelection";
import { getBaseColumns } from "./volunteerColumns";
import { Search, ListFilter, ArrowUpDown, Import, Plus } from "lucide-react";
import { FilterBar } from "./FilterBar";
import { FilterModal, filterModalAlignRight } from "./FilterModal";
import { SortModal } from "./SortModal";
import { FILTERABLE_COLUMNS } from "./volunteerColumns";
import {
  getVolunteersByMultipleColumns,
  FilterTuple,
} from "@/lib/api/getVolunteersByMultipleColumns";
import { getVolunteersTable } from "@/lib/api/getVolunteersTable";
import { useDebounce } from "@/hooks/useDebounce";
import { getCurrentUser } from "@/lib/api/getCurrentUser";

export const VolunteersTable = (): React.JSX.Element => {
  const [data, setData] = useState<Volunteer[]>([]);
  const [allVolunteers, setAllVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isResizingRef = useRef(false);
  const [role, setRole] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterTuple[]>([
    { field: "opt_in_communication", miniOp: "OR", values: ["Yes"] },
  ]);
  const [globalOp, setGlobalOp] = useState<"AND" | "OR">("AND");
  const [isMainFilterOpen, setIsMainFilterOpen] = useState(false);
  const [mainFilterAlignRight, setMainFilterAlignRight] = useState(false);
  const debouncedFilters = useDebounce(filters);
  const debouncedGlobalOp = useDebounce(globalOp);

  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortModalAlignRight, setSortModalAlignRight] = useState(false);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

  const columns = useMemo<ColumnDef<Volunteer>[]>(
    () => [
      {
        id: "select",
        header: ({ table }): React.JSX.Element => (
          <div className="flex items-center justify-center h-full">
            <input
              type="checkbox"
              aria-label="Select all rows on this page"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-gray-900 cursor-pointer"
            />
          </div>
        ),
        cell: ({ row }): React.JSX.Element => (
          <div className="flex items-center justify-center h-full">
            <input
              type="checkbox"
              aria-label={`Select ${row.original.name_org}`}
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-gray-900 cursor-pointer"
            />
          </div>
        ),
        size: 50,
        enableSorting: false,
        enableResizing: false,
      },
      ...getBaseColumns(),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    state: { sorting, rowSelection, globalFilter: debouncedGlobalFilter },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const lowerFilter = String(filterValue).toLowerCase();
      return row.getAllCells().some((cell) => {
        const value = cell.getValue();
        if (Array.isArray(value)) {
          return value.some((tag) =>
            String(tag).toLowerCase().includes(lowerFilter)
          );
        }
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerFilter);
      });
    },
  });

  const {
    isSelected,
    handleCellMouseDown,
    handleCellMouseEnter,
    resetSelection,
  } = useCellSelection(table);

  const filterOptions = useMemo(() => {
    if (!allVolunteers) return {};
    const options: Record<string, Set<string>> = {};
    FILTERABLE_COLUMNS.forEach((col) => {
      if (col.type === "options") {
        options[col.id] = new Set<string>();
      }
    });
    allVolunteers.forEach((volunteer) => {
      FILTERABLE_COLUMNS.forEach((col) => {
        if (col.type === "options") {
          const value = volunteer[col.id as keyof Volunteer];
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (v) options[col.id]?.add(v);
            });
          } else if (value != null) {
            if (col.id === "opt_in_communication") {
              options[col.id]?.add(value ? "Yes" : "No");
            } else {
              options[col.id]?.add(String(value));
            }
          }
        }
      });
    });
    const result: Record<string, string[]> = {};
    Object.keys(options).forEach((key) => {
      result[key] = Array.from(options[key]!).sort();
    });
    return result;
  }, [allVolunteers]);

  const handleOpenMainFilter = (e: React.MouseEvent): void => {
    if (isMainFilterOpen) {
      setIsMainFilterOpen(false);
      return;
    }
    setMainFilterAlignRight(
      filterModalAlignRight(e.currentTarget as HTMLElement)
    );
    setIsMainFilterOpen(true);
  };

  const fetchInitialData = useCallback(async () => {
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
          cohorts: entry.cohorts.map(formatTag),
          current_roles: entry.roles
            .filter((r) => r.type === "current")
            .map(formatTag),
          prior_roles: entry.roles
            .filter((r) => r.type === "prior")
            .map(formatTag),
          future_interests: entry.roles
            .filter((r) => r.type === "future_interest")
            .map(formatTag),
        };
      });
      setAllVolunteers(formattedAll);
    } catch (error) {
      console.error("Error fetching volunteer data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
        setData(allVolunteers);
        setLoading(false);
        return;
      }
      setLoading(true);
      if (resetSelection) resetSelection();
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
          setData(allVolunteers.filter((v) => filteredIds.has(v.id)));
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
  }, [debouncedFilters, debouncedGlobalOp, allVolunteers, resetSelection]);

  useEffect(() => {
    const handleMouseUp = (): void => {
      setTimeout(() => {
        isResizingRef.current = false;
      }, 100);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return (): void => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    const fetchRole = async (): Promise<void> => {
      try {
        const user = await getCurrentUser();
        setRole(user.role);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchRole();
  }, []);

  return (
    <div className="w-full flex flex-col gap-4 p-6 bg-white min-h-150">
      {/* Controls Section */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-2">
        {/* Search Bar */}
        <div className="relative w-full max-w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-800">
            <Search className="w-4 h-4 shrink-0" />
          </div>
          <input
            type="text"
            placeholder="Search volunteers..."
            aria-label="Search volunteers"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 px-4 py-2 bg-primary-purple hover:bg-secondary-purple transition-colors rounded-lg text-sm text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {/* Filter Button + Modal */}
        <div className={clsx("relative", isMainFilterOpen ? "z-50" : "z-10")}>
          <button
            onClick={handleOpenMainFilter}
            className={clsx(
              "flex items-center justify-center gap-2 w-28 py-2 transition-colors rounded-lg text-sm font-medium cursor-pointer",
              filters.length > 0
                ? "bg-secondary-purple text-accent-purple"
                : "bg-primary-purple hover:bg-secondary-purple text-gray-900"
            )}
          >
            <ListFilter className="w-4 h-4 shrink-0" />
            <span>Filter {filters.length > 0 && `(${filters.length})`}</span>
          </button>

          <FilterModal
            isOpen={isMainFilterOpen}
            onClose={() => setIsMainFilterOpen(false)}
            onApply={(newFilter) => {
              if (newFilter) setFilters((prev) => [...prev, newFilter]);
              setIsMainFilterOpen(false);
            }}
            optionsData={filterOptions}
            alignRight={mainFilterAlignRight}
          />
        </div>

        {/* Sort Button + Modal */}
        <div className={clsx("relative", isSortModalOpen ? "z-50" : "z-10")}>
          <button
            onClick={(e) => {
              setSortModalAlignRight(
                filterModalAlignRight(e.currentTarget as HTMLElement)
              );
              setIsSortModalOpen(!isSortModalOpen);
            }}
            className={clsx(
              "flex items-center justify-center gap-2 w-24 py-2 transition-colors rounded-lg text-sm font-medium cursor-pointer",
              sorting.length > 0
                ? "bg-secondary-purple text-accent-purple"
                : "bg-primary-purple hover:bg-secondary-purple text-gray-900"
            )}
          >
            <ArrowUpDown className="w-4 h-4 shrink-0" />
            <span>Sort {sorting.length > 0 && `(${sorting.length})`}</span>
          </button>

          <SortModal
            isOpen={isSortModalOpen}
            onClose={() => setIsSortModalOpen(false)}
            sorting={sorting}
            setSorting={setSorting}
            alignRight={sortModalAlignRight}
          />
        </div>

        {/* New Volunteer Button */}
        {role === "admin" && (
          <button className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-dark-accent-purple transition-colors rounded-lg text-sm font-medium text-white shadow-sm">
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Volunteer</span>
          </button>
        )}

        {/* Import CSV Button */}
        {role === "admin" && (
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-purple hover:bg-secondary-purple transition-colors rounded-lg text-sm font-medium text-gray-900">
            <Import className="w-4 h-4 shrink-0" />
            <span>Import from CSV</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        globalOp={globalOp}
        setGlobalOp={setGlobalOp}
        optionsData={filterOptions}
        sorting={sorting}
        setSorting={setSorting}
      />


      {/* Table Content */}
      {loading ? (
        <div className="space-y-4 p-4 animate-pulse rounded-lg h-64 bg-gray-50">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed border-gray-300 text-gray-500">
          <p>No volunteers found</p>
        </div>
      ) : (
        <div className="border-b border-gray-200 select-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left table-fixed border-collapse">
              <thead className="border-b border-gray-200">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={clsx(
                          "relative group px-4 py-3 font-medium bg-gray-50 text-gray-800 select-none transition-colors whitespace-nowrap cursor-pointer",
                          header.column.getIsFirstColumn() && "rounded-tl-lg",
                          header.column.getIsLastColumn() && "rounded-tr-lg",
                          "hover:bg-gray-100"
                        )}
                        style={{
                          width: header.getSize(),
                          minWidth: "max-content",
                        }}
                        onClick={(e) => {
                          if (isResizingRef.current) return;
                          if (header.column.getIsFirstColumn())
                            table.toggleAllPageRowsSelected();
                          else header.column.getToggleSortingHandler()?.(e);
                        }}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {header.column.getCanSort() && (
                            <span className="w-4 text-center shrink-0 text-gray-400">
                              {header.column.getIsSorted() ? (
                                { asc: "↑", desc: "↓" }[
                                  header.column.getIsSorted() as string
                                ]
                              ) : (
                                <span className="opacity-0">↑</span>
                              )}
                            </span>
                          )}
                        </div>
                        {header.column.getCanResize() && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => {
                              isResizingRef.current = true;
                              header.getResizeHandler()(e);
                              e.stopPropagation();
                            }}
                            onTouchStart={(e) => {
                              isResizingRef.current = true;
                              header.getResizeHandler()(e);
                              e.stopPropagation();
                            }}
                            className={clsx(
                              "absolute top-0 h-full w-1 cursor-col-resize select-none touch-none",
                              "hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity",
                              "-right-0.5 z-10",
                              header.column.getIsResizing() &&
                                "bg-blue-600 opacity-100"
                            )}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="">
                {((): React.JSX.Element[] => {
                  const rows = table.getRowModel().rows;
                  const visibleCols = table.getVisibleLeafColumns();

                  return rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={clsx(
                        "group transition-colors border-b border-gray-100 bg-white",
                        "hover:bg-gray-50",
                        "data-[state=selected]:bg-blue-100/30",
                        "data-[state=selected]:hover:bg-blue-100/50"
                      )}
                    >
                      {row.getVisibleCells().map((cell, colIndex) => {
                        const cellSelected = isSelected(
                          String(row.id),
                          cell.column.id
                        );
                        const isSelectColumn = cell.column.id === "select";
                        const topRow = rows[rowIndex - 1];
                        const bottomRow = rows[rowIndex + 1];
                        const leftCol = visibleCols[colIndex - 1];
                        const rightCol = visibleCols[colIndex + 1];

                        const topSelected =
                          topRow &&
                          isSelected(String(topRow.id), cell.column.id);
                        const bottomSelected =
                          bottomRow &&
                          isSelected(String(bottomRow.id), cell.column.id);
                        const leftSelected =
                          leftCol && isSelected(String(row.id), leftCol.id);
                        const rightSelected =
                          rightCol && isSelected(String(row.id), rightCol.id);

                        return (
                          <td
                            key={cell.id}
                            onMouseDown={(e) =>
                              handleCellMouseDown(e, cell, rowIndex, colIndex)
                            }
                            onMouseEnter={(e) =>
                              handleCellMouseEnter(e, cell, rowIndex, colIndex)
                            }
                            onClick={() => {
                              if (isSelectColumn) row.toggleSelected();
                            }}
                            className={clsx(
                              "relative px-4 py-3 text-gray-900 font-normal",
                              isSelectColumn && "cursor-pointer",
                              cellSelected && "bg-blue-100/50"
                            )}
                            style={{ width: cell.column.getSize() }}
                          >
                            <div className="truncate w-full h-full">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </div>
                            {cellSelected && (
                              <div
                                className={clsx(
                                  "absolute pointer-events-none z-10 border-blue-300",
                                  "-top-px -bottom-px -left-px -right-px",
                                  !topSelected && "border-t-2",
                                  !bottomSelected && "border-b-2",
                                  !leftSelected && "border-l-2",
                                  !rightSelected && "border-r-2"
                                )}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between py-4 border-t border-gray-200 mt-4">
            <span className="text-sm text-gray-600">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteersTable;
