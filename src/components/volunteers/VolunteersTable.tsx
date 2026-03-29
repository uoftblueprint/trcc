"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import clsx from "clsx";
import type { Volunteer } from "./types";
import { useCellSelection } from "./useCellSelection";
import { getBaseColumns, FILTERABLE_COLUMNS } from "./volunteerColumns";
import { AlertCircle } from "lucide-react";
import { FilterBar } from "./FilterBar";
import { TableToolbar } from "./TableToolbar";
import { TablePagination } from "./TablePagination";
import { AddVolunteerModal } from "./AddVolunteerModal";
import { ImportCSVModal } from "./ImportCSVModal";
import { getCurrentUser } from "@/lib/api/getCurrentUser";
import {
  PRONOUN_OPTIONS,
  OPT_IN_OPTIONS,
  sortCohorts,
  sortRoles,
} from "./utils";
import { useVolunteersData } from "./useVolunteersData";
import { useVolunteerEdits } from "./useVolunteerEdits";

const VolunteersTableContent = ({
  role,
}: {
  role: string | null;
}): React.JSX.Element => {
  const [editedRows, setEditedRows] = useState<
    Record<number, Partial<Volunteer>>
  >({});
  const editedRowsRef = useRef(editedRows);

  useEffect(() => {
    editedRowsRef.current = editedRows;
  }, [editedRows]);

  const isResizingRef = useRef(false);

  const isAdmin = role === "admin";

  const [isAddVolunteerOpen, setIsAddVolunteerOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);

  const {
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
    sorting,
    setSorting,
    rowSelection,
    setRowSelection,
    debouncedGlobalFilter,
    fetchInitialData,
    debouncedFilters,
  } = useVolunteersData({ isAdmin, editedRowsRef });

  const {
    isSaving,
    saveErrors,
    hasEdits,
    handleCellEdit,
    handleSaveEdits,
    handleCancelEdits,
  } = useVolunteerEdits({
    editedRows,
    setEditedRows,
    allVolunteers,
    allRoles,
    allCohorts,
    setData,
    setLoading,
    fetchInitialData,
  });

  const filterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    FILTERABLE_COLUMNS.forEach((col) => {
      if (col.type === "options") options[col.id] = new Set();
    });

    allCohorts.forEach((c) => options["cohorts"]?.add(`${c.term} ${c.year}`));
    allRoles.forEach((r) => {
      if (r.type === "current") options["current_roles"]?.add(r.name);
      if (r.type === "prior") options["prior_roles"]?.add(r.name);
      if (r.type === "future_interest")
        options["future_interests"]?.add(r.name);
    });

    PRONOUN_OPTIONS.forEach((p) => options["pronouns"]?.add(p));
    OPT_IN_OPTIONS.forEach((o) => options["opt_in_communication"]?.add(o));

    allVolunteers.forEach((volunteer) => {
      FILTERABLE_COLUMNS.forEach((col) => {
        if (col.type === "options") {
          const value = volunteer[col.id as keyof Volunteer];
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (v) options[col.id]?.add(String(v));
            });
          } else if (value != null) {
            if (col.id === "opt_in_communication")
              options[col.id]?.add(value ? "Yes" : "No");
            else options[col.id]?.add(String(value));
          }
        }
      });
    });

    const PREDEFINED_ORDERS: Record<string, string[]> = {
      pronouns: PRONOUN_OPTIONS,
      opt_in_communication: OPT_IN_OPTIONS,
    };

    const result: Record<string, string[]> = {};
    for (const key in options) {
      const arr = Array.from(options[key] || []);
      const orderArray = PREDEFINED_ORDERS[key];

      if (orderArray) {
        result[key] = arr.sort((a, b) => {
          const idxA = orderArray.indexOf(a);
          const idxB = orderArray.indexOf(b);
          if (idxA === -1 && idxB === -1) return a.localeCompare(b);
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      } else if (key === "cohorts") {
        result[key] = arr.sort(sortCohorts);
      } else {
        result[key] = arr.sort(sortRoles);
      }
    }
    return result;
  }, [allVolunteers, allRoles, allCohorts]);

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
      ...getBaseColumns(isAdmin, handleCellEdit, filterOptions),
    ],
    [isAdmin, handleCellEdit, filterOptions]
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

  useEffect(() => {
    resetSelection();
  }, [debouncedFilters, debouncedGlobalFilter, resetSelection]);

  useEffect(() => {
    const handleMouseUp = (): void => {
      setTimeout(() => {
        isResizingRef.current = false;
      }, 100);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return (): void => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div className="w-full flex flex-col gap-4 p-6 bg-white min-h-150">
      <TableToolbar
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        filters={filters}
        setFilters={setFilters}
        sorting={sorting}
        setSorting={setSorting}
        filterOptions={filterOptions}
        role={role}
        onOpenAddVolunteer={() => setIsAddVolunteerOpen(true)}
        onOpenImportCSV={() => setIsImportCSVOpen(true)}
      />

      {saveErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mt-2 mb-2">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Errors occurred while saving your changes:
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc pl-5">
                {saveErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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
                              "absolute top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity -right-0.5 z-10",
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

              <tbody>
                {((): React.JSX.Element[] => {
                  const rows = table.getRowModel().rows;
                  const visibleCols = table.getVisibleLeafColumns();

                  return rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={clsx(
                        "group transition-colors border-b border-gray-100 bg-white hover:bg-gray-50",
                        "data-[state=selected]:bg-blue-100/30 data-[state=selected]:hover:bg-blue-100/50"
                      )}
                    >
                      {row.getVisibleCells().map((cell, colIndex) => {
                        const cellSelected = isSelected(
                          String(row.id),
                          cell.column.id
                        );
                        const isSelectColumn = cell.column.id === "select";
                        const isModified =
                          editedRows[row.original.id]?.[
                            cell.column.id as keyof Volunteer
                          ] !== undefined;

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
                              cellSelected && "bg-blue-100/50",
                              !cellSelected &&
                                isModified &&
                                "bg-amber-50 transition-colors duration-300"
                            )}
                            style={{ width: cell.column.getSize() }}
                          >
                            <div className="w-full h-full overflow-hidden">
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

          <TablePagination
            table={table}
            hasEdits={hasEdits}
            isSaving={isSaving}
            onSave={handleSaveEdits}
            onCancel={handleCancelEdits}
          />
        </div>
      )}

      <AddVolunteerModal
        isOpen={isAddVolunteerOpen}
        onClose={() => setIsAddVolunteerOpen(false)}
        onSuccess={() => {
          setLoading(true);
          fetchInitialData();
        }}
      />

      <ImportCSVModal
        isOpen={isImportCSVOpen}
        onClose={() => setIsImportCSVOpen(false)}
        onSuccess={() => {
          setLoading(true);
          fetchInitialData();
        }}
      />
    </div>
  );
};

export const VolunteersTable = (): React.JSX.Element => {
  const [role, setRole] = useState<string | null>(null);
  const [isRoleFetched, setIsRoleFetched] = useState(false);

  useEffect(() => {
    const fetchRole = async (): Promise<void> => {
      try {
        const user = await getCurrentUser();
        setRole(user.role);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      } finally {
        setIsRoleFetched(true);
      }
    };
    fetchRole();
  }, []);

  if (!isRoleFetched) {
    return (
      <div className="w-full flex flex-col gap-4 p-6 bg-white min-h-150">
        <div className="space-y-4 p-4 animate-pulse rounded-lg h-64 bg-gray-50">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return <VolunteersTableContent role={role} />;
};

export default VolunteersTable;
