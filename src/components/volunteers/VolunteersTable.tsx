"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
import toast from "react-hot-toast";
import type { Volunteer } from "./types";
import { useCellSelection } from "./useCellSelection";
import {
  getBaseColumns,
  FILTERABLE_COLUMNS,
  COLUMNS_CONFIG,
} from "./volunteerColumns";
import { AlertCircle } from "lucide-react";
import { FilterBar } from "./FilterBar";
import { TableToolbar } from "./TableToolbar";
import { TablePagination } from "./TablePagination";
import { AddVolunteerModal } from "./AddVolunteerModal";
import { ManageTagsModal } from "./ManageTagsModal";
import { ImportCSVModal } from "./ImportCSVModal";
import { DeleteVolunteersConfirmModal } from "./DeleteVolunteersConfirmModal";
import { VolunteersTableHelpModal } from "./VolunteersTableHelpModal";
import { getCurrentUser } from "@/lib/api/getCurrentUser";
import { removeVolunteersAction } from "@/lib/api/actions";
import {
  PRONOUN_OPTIONS,
  OPT_IN_OPTIONS,
  sortCohorts,
  sortRoles,
} from "./utils";
import { useVolunteersData } from "./useVolunteersData";
import { useVolunteerEdits } from "./useVolunteerEdits";
import type { CopyCellFormat } from "./copySelectedCells";

type PendingCellChange = {
  colId: string;
  label: string;
  from: string;
  to: string;
};

type PendingRowChange = {
  volunteerId: number;
  volunteerLabel: string;
  changes: PendingCellChange[];
};

const formatPendingValue = (colId: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (colId === "opt_in_communication") {
    if (value === true) return "Yes";
    if (value === false) return "No";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join(", ") : "(empty)";
  }
  return String(value);
};

/** Skip table shortcuts when the user is typing in an input or contentEditable (e.g. inline cell edit). */
function isKeyboardTargetInsideEditableField(
  target: EventTarget | null
): boolean {
  if (!target || !(target instanceof Node)) return false;
  const node =
    target.nodeType === Node.TEXT_NODE
      ? target.parentElement
      : (target as Element);
  if (!node || !(node instanceof HTMLElement)) return false;
  const tag = node.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (node.isContentEditable) return true;
  return node.closest("[contenteditable='true']") !== null;
}

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
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);

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
    handleBulkEdit,
    handleSaveEdits,
    handleCancelEdits,
    canUndo,
    canRedo,
    undo,
    redo,
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

    allCohorts.forEach((c) => {
      if (c.is_active) options["cohorts"]?.add(`${c.term} ${c.year}`);
    });
    allRoles.forEach((r) => {
      if (!r.is_active) return;
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

    for (const edits of Object.values(editedRows)) {
      for (const [colId, value] of Object.entries(edits)) {
        const bucket = options[colId];
        if (!bucket) continue;
        if (Array.isArray(value)) {
          value.forEach((v) => {
            if (v) bucket.add(String(v));
          });
        } else if (value != null) {
          if (colId === "opt_in_communication")
            bucket.add(value ? "Yes" : "No");
          else bucket.add(String(value));
        }
      }
    }

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
  }, [allVolunteers, allRoles, allCohorts, editedRows]);

  const pendingChanges = useMemo<PendingRowChange[]>(() => {
    return Object.entries(editedRows)
      .map(([id, partial]) => {
        const volunteerId = Number(id);
        const original = allVolunteers.find((v) => v.id === volunteerId);
        if (!original) return null;

        const volunteerLabel =
          original.name_org?.trim() || original.pseudonym?.trim() || `ID ${id}`;

        const changes: PendingCellChange[] = Object.entries(partial).map(
          ([colId, nextValue]) => {
            const colLabel =
              COLUMNS_CONFIG.find((c) => String(c.id) === colId)?.label ??
              colId;
            const prevValue = original[colId as keyof Volunteer];
            return {
              colId,
              label: colLabel,
              from: formatPendingValue(colId, prevValue),
              to: formatPendingValue(colId, nextValue),
            };
          }
        );

        if (changes.length === 0) return null;
        return { volunteerId, volunteerLabel, changes };
      })
      .filter((row): row is PendingRowChange => row !== null)
      .sort((a, b) => a.volunteerLabel.localeCompare(b.volunteerLabel));
  }, [editedRows, allVolunteers]);

  const pendingChangesCount = useMemo(
    () => pendingChanges.reduce((acc, row) => acc + row.changes.length, 0),
    [pendingChanges]
  );

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
    /** Stable row identity avoids reusing row DOM/state when sort/page changes (default ids are row indices). */
    getRowId: (row) => String(row.id),
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
    autoResetPageIndex: false,
    enableMultiSort: true,
    /** Only Cmd (macOS) / Ctrl (Windows) adds another sort level; plain click replaces with a single-column sort. */
    isMultiSortEvent: (e: unknown): boolean => {
      const ev = e as MouseEvent;
      return ev.metaKey || ev.ctrlKey;
    },
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
    selectedCells,
    isSelected,
    handleCellMouseDown,
    handleCellMouseEnter,
    resetSelection,
    selectedCellCount,
    copySelectedCells,
  } = useCellSelection(table);
  const clearValueForColumn = useCallback((colId: string): unknown => {
    const col = COLUMNS_CONFIG.find((c) => String(c.id) === colId);
    if (!col) return "";
    if (col.filterType === "options") return col.isMulti ? [] : null;
    return "";
  }, []);

  const clearSelectedCells = useCallback((): void => {
    const selectedIds = Object.keys(selectedCells).filter(
      (k) => selectedCells[k]
    );
    if (selectedIds.length === 0) return;

    const bulkEdits: Array<{ rowId: number; colId: string; value: unknown }> =
      [];
    selectedIds.forEach((id) => {
      const separatorIndex = id.indexOf("_");
      if (separatorIndex === -1) return;
      const rowKey = id.slice(0, separatorIndex);
      const colId = id.slice(separatorIndex + 1);
      if (!rowKey || !colId || colId === "select" || colId === "volunteer_id")
        return;

      const row = table.getRowModel().rows.find((r) => String(r.id) === rowKey);
      const volunteerId = row?.original.id;
      if (!volunteerId) return;

      bulkEdits.push({
        rowId: volunteerId,
        colId,
        value: clearValueForColumn(colId),
      });
    });
    handleBulkEdit(bulkEdits);
  }, [selectedCells, table, handleBulkEdit, clearValueForColumn]);

  const handleCopyCells = useCallback(
    async (format: CopyCellFormat): Promise<void> => {
      const ok = await copySelectedCells(format);
      if (ok) {
        const label =
          format === "tsv"
            ? "Tab-separated"
            : format === "csv"
              ? "CSV"
              : "Plain text";
        toast.success(`Copied ${selectedCellCount} cell(s) (${label})`);
      } else {
        toast.error("Could not copy to clipboard");
      }
    },
    [copySelectedCells, selectedCellCount]
  );

  useEffect(() => {
    resetSelection();
  }, [debouncedFilters, debouncedGlobalFilter, resetSelection]);

  const selectedRowIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => {
        const row = table.getRowModel().rows.find((r) => r.id === key);
        return row?.original.id;
      })
      .filter((id): id is number => id !== undefined);
  }, [rowSelection, table]);

  const volunteersPendingDelete = useMemo(() => {
    return selectedRowIds.map((id) => {
      const row = data.find((v) => v.id === id);
      return {
        id,
        name: row?.name_org ?? "",
      };
    });
  }, [selectedRowIds, data]);

  const requestDeleteVolunteers = (): void => {
    if (selectedRowIds.length === 0) return;
    setDeleteModalOpen(true);
  };

  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedRowIds.length === 0) return;

    setDeleteModalOpen(false);
    setIsDeleting(true);
    const deleteToast = toast.loading(
      `Deleting ${selectedRowIds.length} volunteer(s)...`
    );
    try {
      const result = await removeVolunteersAction(selectedRowIds);
      if (result.failed > 0) {
        const firstError = result.errors[0];
        const message =
          result.failed === 1 && firstError
            ? firstError
            : `${result.failed} volunteer(s) could not be deleted${
                firstError ? ` (e.g. ${firstError})` : ""
              }`;
        toast.error(message, { id: deleteToast });
      } else {
        toast.success(`${result.succeeded} volunteer(s) deleted`, {
          id: deleteToast,
        });
      }
      if (result.succeeded > 0) {
        setRowSelection({});
        setLoading(true);
        fetchInitialData();
      }
    } catch (error) {
      console.error("[VolunteersTable] Delete failed:", error);
      toast.error("Delete failed — please try again", { id: deleteToast });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    /** Capture phase: run before focused EditableCell (tabIndex=0) handles Delete, which would
     * call handleCellEdit for one cell and then handleBulkEdit would snapshot wrong priors for it. */
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (isKeyboardTargetInsideEditableField(e.target)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const hasSelectedCells = Object.keys(selectedCells).some(
          (k) => selectedCells[k]
        );
        if (hasSelectedCells) {
          e.preventDefault();
          e.stopPropagation();
          clearSelectedCells();
          return;
        }
        if (selectedRowIds.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        requestDeleteVolunteers();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return (): void =>
      window.removeEventListener("keydown", handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedRowIds, selectedCells, clearSelectedCells]);

  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent): void => {
      if (isKeyboardTargetInsideEditableField(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (mod && e.key === "z" && e.shiftKey) ||
        (mod && e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleUndoRedo);
    return (): void => window.removeEventListener("keydown", handleUndoRedo);
  }, [undo, redo]);

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
    <div className="w-full flex flex-col gap-3 min-h-150">
      <VolunteersTableHelpModal role={role} />
      <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-3">
          <TableToolbar
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            filters={filters}
            setFilters={setFilters}
            sorting={sorting}
            setSorting={setSorting}
            filterOptions={filterOptions}
            role={role}
            selectedCount={selectedRowIds.length}
            isDeleting={isDeleting}
            onDelete={requestDeleteVolunteers}
            onOpenAddVolunteer={() => setIsAddVolunteerOpen(true)}
            onOpenImportCSV={() => setIsImportCSVOpen(true)}
            onOpenManageTags={() => setIsManageTagsOpen(true)}
            hasEdits={hasEdits}
            isSaving={isSaving}
            onSave={handleSaveEdits}
            onCancel={handleCancelEdits}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            pendingChangesCount={pendingChangesCount}
            onViewChanges={() => setIsChangesModalOpen(true)}
            selectedCellCount={selectedCellCount}
            onCopyCells={handleCopyCells}
          />
        </div>
        {(filters.length > 0 || sorting.length > 0) && (
          <div className="border-t border-gray-100 px-3 pb-3 pt-2">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              globalOp={globalOp}
              setGlobalOp={setGlobalOp}
              optionsData={filterOptions}
              sorting={sorting}
              setSorting={setSorting}
            />
          </div>
        )}
      </div>

      {saveErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
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

      {/* Table Content */}
      {loading ? (
        <div className="space-y-4 p-4 animate-pulse rounded-xl h-64 bg-white border border-gray-200 shadow-sm">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-xl border-dashed border-gray-300 bg-white text-gray-500 shadow-sm">
          <p className="font-medium">No volunteers found</p>
          <p className="text-sm mt-1">Try changing filters or search terms.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-0 select-none">
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

          <TablePagination table={table} />
        </div>
      )}

      <AddVolunteerModal
        isOpen={isAddVolunteerOpen}
        onClose={() => setIsAddVolunteerOpen(false)}
        optionsData={filterOptions}
        onSuccess={() => {
          toast.success("Volunteer added");
          setLoading(true);
          fetchInitialData();
        }}
      />

      <ImportCSVModal
        isOpen={isImportCSVOpen}
        onClose={() => setIsImportCSVOpen(false)}
        onSuccess={() => {
          toast.success("CSV imported successfully");
          setLoading(true);
          fetchInitialData();
        }}
      />

      <ManageTagsModal
        isOpen={isManageTagsOpen}
        onClose={() => setIsManageTagsOpen(false)}
        roles={allRoles}
        cohorts={allCohorts}
        onRefresh={() => {
          setLoading(true);
          fetchInitialData();
        }}
      />

      <DeleteVolunteersConfirmModal
        isOpen={deleteModalOpen}
        volunteers={volunteersPendingDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteSelected}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {isChangesModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-100"
            onClick={() => setIsChangesModalOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-101 w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2
                id="unsaved-changes-title"
                className="text-lg font-semibold text-gray-900"
              >
                Unsaved Changes ({pendingChangesCount})
              </h2>
              <button
                type="button"
                onClick={() => setIsChangesModalOpen(false)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {pendingChanges.length === 0 ? (
                <p className="text-sm text-gray-600">No pending changes.</p>
              ) : (
                pendingChanges.map((row) => (
                  <section
                    key={row.volunteerId}
                    className="border border-gray-200 rounded-lg"
                  >
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-900">
                      {row.volunteerLabel} ({row.changes.length})
                    </div>
                    <div className="divide-y divide-gray-100">
                      {row.changes.map((change) => (
                        <div
                          key={`${row.volunteerId}-${change.colId}`}
                          className="px-4 py-2 text-sm grid grid-cols-12 gap-3"
                        >
                          <span className="col-span-3 text-gray-700 font-medium">
                            {change.label}
                          </span>
                          <span className="col-span-4 text-gray-500 break-words">
                            {change.from}
                          </span>
                          <span className="col-span-1 text-center text-gray-400">
                            →
                          </span>
                          <span className="col-span-4 text-gray-900 break-words">
                            {change.to}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </>
      )}
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
