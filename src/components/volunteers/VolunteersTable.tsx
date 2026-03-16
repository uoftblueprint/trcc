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
import { VolunteerTag } from "./VolunteerTag";
import { useCellSelection } from "./useCellSelection";
import {
  Search,
  ListFilter,
  ArrowUpDown,
  CaseSensitive,
  User,
  AtSign,
  Phone,
  List,
  TextAlignStart,
  Import,
  Plus,
} from "lucide-react";
import { HeaderWithIcon } from "./HeaderWithIcon";
import {
  getVolunteersTable,
  VolunteerTableEntry,
} from "@/lib/api/getVolunteersTable";

// TODO: Here for demonstration, remove later in favour of proper filtering
const getMockVolunteers = async (filter?: string): Promise<Volunteer[]> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  const baseData = Array(15)
    .fill(null)
    .map(
      (_, i): Volunteer => ({
        id: i,
        name_org: `Volunteer ${i + 1}`,
        pseudonym: `Pseudonym ${i + 1}`,
        pronouns: i % 2 === 0 ? "She/Her" : "He/Him",
        email: "volunteer@example.com",
        phone: "123-456-7890",
        position: "Member",
        notes: "Notes...",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        opt_in_communication: true,
        cohorts: ["2025 Fall", "2025 Summer", "2025 Spring"],
        prior_roles: ["Crisis Line Counsellor"],
        current_roles:
          i % 2 !== 0 ? ["Emergency Back-up", "Chat Counsellor"] : [],
        future_interests: i % 2 === 0 ? ["Chat Counsellor"] : [],
      })
    );

  if (filter === "2024 Only") {
    return baseData
      .slice(0, 3)
      .map((v) => ({ ...v, cohorts: ["2024 Spring"] }));
  }

  return baseData;
};

export const VolunteersTable = (): React.JSX.Element => {
  const [data, setData] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isResizingRef = useRef(false);

  const [dataSource, setDataSource] = useState<string>("backend");

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Volunteer>[]>(
    () => [
      {
        id: "select",
        header: ({ table }): React.JSX.Element => (
          <div className="flex items-center justify-center h-full">
            <input
              type="checkbox"
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
      {
        accessorKey: "name_org",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={CaseSensitive} label="Full Name" />
        ),
        size: 140,
      },
      {
        accessorKey: "pseudonym",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={CaseSensitive} label="Pseudonym" />
        ),
        size: 150,
      },
      {
        accessorKey: "pronouns",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={User} label="Pronouns" />
        ),
        cell: (info): React.JSX.Element => (
          <VolunteerTag label={info.getValue() as string} />
        ),
        size: 120,
      },
      {
        accessorKey: "email",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={AtSign} label="Email" />
        ),
        size: 200,
      },
      {
        accessorKey: "phone",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={Phone} label="Phone" />
        ),
        size: 140,
      },
      {
        accessorKey: "cohorts",
        enableGlobalFilter: true,
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={List} label="Cohorts" />
        ),
        cell: (info): React.JSX.Element => (
          <div className="flex flex-wrap gap-1">
            {(info.getValue() as string[]).map((tag, i) => (
              <VolunteerTag key={i} label={tag} />
            ))}
          </div>
        ),
        size: 150,
      },
      {
        accessorKey: "prior_roles",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={User} label="Prior Role" />
        ),
        cell: (info): React.JSX.Element => (
          <div className="flex flex-wrap gap-1">
            {(info.getValue() as string[]).map((tag, i) => (
              <VolunteerTag key={i} label={tag} />
            ))}
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "current_roles",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={User} label="Current Role" />
        ),
        cell: (info): React.JSX.Element => (
          <div className="flex flex-wrap gap-1">
            {(info.getValue() as string[]).map((tag, i) => (
              <VolunteerTag key={i} label={tag} />
            ))}
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "future_interests",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={User} label="Future Interest" />
        ),
        cell: (info): React.JSX.Element => (
          <div className="flex flex-wrap gap-1">
            {(info.getValue() as string[]).map((tag, i) => (
              <VolunteerTag key={i} label={tag} />
            ))}
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "notes",
        header: (): React.JSX.Element => (
          <HeaderWithIcon icon={TextAlignStart} label="Notes" />
        ),
        size: 200,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    state: { sorting, rowSelection, globalFilter },
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

  const handleFetchData = useCallback(
    async (source: string) => {
      setLoading(true);
      setGlobalFilter("");
      setSorting([]);
      setRowSelection({});
      if (resetSelection) resetSelection();

      try {
        if (source === "empty") {
          setData([]);
          setLoading(false);
          return;
        }

        if (source === "mock") {
          const mockData = await getMockVolunteers();
          setData(mockData);
          setLoading(false);
          return;
        }

        const result: VolunteerTableEntry[] = await getVolunteersTable();
        const transformedData: Volunteer[] = result.map((entry) => {
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
        setData(transformedData);
      } catch (error) {
        console.error("Failed to fetch volunteers:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [resetSelection]
  );

  // TODO: Modify to use proper filtering
  const handleSourceChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const newSource = e.target.value;
    setDataSource(newSource);
    handleFetchData(newSource);
  };

  useEffect(() => {
    handleFetchData("backend");
  }, [handleFetchData]);

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
    <div className="w-full flex flex-col gap-4 p-6 bg-white">
      {/* Controls Section */}
      <div className="flex items-center justify-end gap-3 mb-2">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-800">
            <Search className="w-4 h-4 shrink-0" />
          </div>
          <input
            type="text"
            placeholder="Search volunteers..."
            aria-label="Search volunteers"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-96 pl-10 px-4 py-2 bg-primary-purple hover:bg-secondary-purple transition-colors rounded-lg text-sm text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {/* TODO: Implement filter functionality */}
        {/* Filter / Source Button */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-900">
            <ListFilter className="w-4 h-4 shrink-0" />
          </div>
          <select
            value={dataSource}
            onChange={handleSourceChange}
            className="appearance-none pl-10 pr-8 py-2 bg-primary-purple hover:bg-secondary-purple cursor-pointer transition-colors rounded-lg text-sm font-medium text-gray-900 border-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="backend">Backend Data</option>
            <option value="mock">Sample Data</option>
            <option value="empty">Empty Table</option>
          </select>
        </div>

        {/* TODO: Implement sorting functionality */}
        {/* Sort Button */}
        <button
          onClick={() => {}}
          className="flex items-center gap-2 px-4 py-2 bg-primary-purple hover:bg-secondary-purple transition-colors rounded-lg text-sm font-medium text-gray-900"
        >
          <ArrowUpDown className="w-4 h-4 shrink-0" />
          <span>Sort</span>
        </button>

        {/* New Volunteer Button */}
        <button className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-dark-accent-purple transition-colors rounded-lg text-sm font-medium text-white shadow-sm">
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Volunteer</span>
        </button>

        {/* Import CSV Button */}
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-purple hover:bg-secondary-purple transition-colors rounded-lg text-sm font-medium text-gray-900">
          <Import className="w-4 h-4 shrink-0" />
          <span>Import from CSV</span>
        </button>
      </div>

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
                {table.getRowModel().rows.map((row, rowIndex) => (
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

                      const visibleCols = table.getVisibleLeafColumns();
                      const topRow = table.getRowModel().rows[rowIndex - 1];
                      const bottomRow = table.getRowModel().rows[rowIndex + 1];
                      const leftCol = visibleCols[colIndex - 1];
                      const rightCol = visibleCols[colIndex + 1];

                      const topSelected =
                        topRow && isSelected(String(topRow.id), cell.column.id);
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
                                "absolute pointer-events-none z-50 border-blue-300",
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
                ))}
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
