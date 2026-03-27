import React from "react";
import { Table } from "@tanstack/react-table";
import { Volunteer } from "./types";

interface TablePaginationProps {
  table: Table<Volunteer>;
  hasEdits: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const TablePagination = ({
  table,
  hasEdits,
  isSaving,
  onCancel,
  onSave,
}: TablePaginationProps): React.JSX.Element => {
  return (
    <div className="flex items-center justify-between py-4 border-t border-gray-200 mt-4">
      <span className="text-sm text-gray-600">
        Page {table.getState().pagination.pageIndex + 1} of{" "}
        {table.getPageCount()}
      </span>

      <div className="flex items-center gap-4">
        {hasEdits && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
          </div>
        )}

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
    </div>
  );
};
