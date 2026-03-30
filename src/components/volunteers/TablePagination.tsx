import React from "react";
import { Table } from "@tanstack/react-table";
import { Volunteer } from "./types";

interface TablePaginationProps {
  table: Table<Volunteer>;
}

export const TablePagination = ({
  table,
}: TablePaginationProps): React.JSX.Element => {
  return (
    <div className="flex items-center justify-between py-4 border-t border-gray-200 mt-4">
      <span className="text-sm text-gray-600">
        Page {table.getState().pagination.pageIndex + 1} of{" "}
        {table.getPageCount()}
      </span>

      <div className="flex gap-2">
        <button
          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </button>
        <button
          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </button>
      </div>
    </div>
  );
};
