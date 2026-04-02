import { Table } from "@tanstack/react-table";
import type { Volunteer } from "./types";
import { formatCellData } from "./utils";

export type CopyCellFormat = "tsv" | "csv" | "plain";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    const q = "\"";
    return q + value.split(q).join(q + q) + q;
  }
  return value;
}

/**
 * Builds clipboard text for the current cell selection. Returns null if nothing is selected.
 */
export function buildSelectedCellsText(
  table: Table<Volunteer>,
  selectedCells: Record<string, boolean>,
  format: CopyCellFormat
): string | null {
  const selectedIds = Object.keys(selectedCells).filter(
    (k) => selectedCells[k]
  );
  if (selectedIds.length === 0) return null;

  const rowsMap = new Map<string, { colIndex: number; value: string }[]>();
  const tableRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();

  selectedIds.forEach((id) => {
    const separatorIndex = id.indexOf("_");
    if (separatorIndex === -1) return;

    const rowId = id.slice(0, separatorIndex);
    const colId = id.slice(separatorIndex + 1);

    if (!rowId || !colId) return;

    const row = tableRows.find((r) => String(r.id) === rowId);
    const colIndex = visibleColumns.findIndex((c) => c.id === colId);

    if (row && colIndex !== -1) {
      const cellValue = row.getValue(colId);
      const formattedValue = formatCellData(cellValue);
      if (!rowsMap.has(rowId)) rowsMap.set(rowId, []);
      rowsMap.get(rowId)?.push({ colIndex, value: formattedValue });
    }
  });

  const sortedRowIds = Array.from(rowsMap.keys()).sort((a, b) => {
    const idxA = tableRows.findIndex((r) => String(r.id) === a);
    const idxB = tableRows.findIndex((r) => String(r.id) === b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const rowStrings = sortedRowIds.map((rowId) => {
    const cells = rowsMap.get(rowId) || [];
    cells.sort((a, b) => a.colIndex - b.colIndex);
    const values = cells.map((c) => c.value);

    if (format === "csv") {
      return values.map(escapeCsvField).join(",");
    }
    if (format === "tsv") {
      return values.join("\t");
    }
    return values.join(", ");
  });

  return rowStrings.join("\n");
}

export async function writeSelectedCellsToClipboard(
  table: Table<Volunteer>,
  selectedCells: Record<string, boolean>,
  format: CopyCellFormat
): Promise<boolean> {
  const text = buildSelectedCellsText(table, selectedCells, format);
  if (text == null) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
