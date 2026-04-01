import React from "react";
import { Table } from "@tanstack/react-table";
import { Volunteer } from "./types";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

interface TablePaginationProps {
  table: Table<Volunteer>;
}

export const TablePagination = ({
  table,
}: TablePaginationProps): React.JSX.Element => {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="w-full min-w-0 border-t border-gray-200 mt-4 px-4 sm:px-5 py-4">
      <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm min-w-0">
          <span className="text-gray-600 whitespace-nowrap">
            Page {pageIndex + 1} of {table.getPageCount()}
          </span>
          <span className="text-gray-400 whitespace-nowrap">
            ({totalRows} volunteer{totalRows !== 1 && "s"})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0 sm:justify-end sm:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="page-size"
              className="text-sm text-gray-600 shrink-0"
            >
              Show
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300 shrink-0"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600 shrink-0">per page</span>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
