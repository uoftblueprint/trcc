import { useState, useRef, useEffect, useCallback } from "react";
import { Table, Cell } from "@tanstack/react-table";
import type { Volunteer } from "./types";
import { formatCellData } from "./utils";

export type CellCoords = {
  rowIndex: number;
  colIndex: number;
};

export type UseCellSelectionReturn = {
  selectedCells: Record<string, boolean>;
  isDragging: boolean;
  isSelected: (rowId: string, colId: string) => boolean;
  handleCellMouseDown: (
    e: React.MouseEvent,
    cell: Cell<Volunteer, unknown>,
    rowIndex: number,
    colIndex: number
  ) => void;
  handleCellMouseEnter: (
    e: React.MouseEvent,
    cell: Cell<Volunteer, unknown>,
    rowIndex: number,
    colIndex: number
  ) => void;
  resetSelection: () => void;
};

export const useCellSelection = (
  table: Table<Volunteer>
): UseCellSelectionReturn => {
  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>(
    {}
  );
  const [draggedRange, setDraggedRange] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<CellCoords | null>(null);
  const [lastClickedCell, setLastClickedCell] = useState<CellCoords | null>(
    null
  );
  const [isDragAdding, setIsDragAdding] = useState(true);

  const selectedCellsRef = useRef(selectedCells);
  const draggedRangeRef = useRef(draggedRange);
  const isDragAddingRef = useRef(isDragAdding);

  useEffect(() => {
    selectedCellsRef.current = selectedCells;
  }, [selectedCells]);
  useEffect(() => {
    draggedRangeRef.current = draggedRange;
  }, [draggedRange]);
  useEffect(() => {
    isDragAddingRef.current = isDragAdding;
  }, [isDragAdding]);

  const getCellIdsInRange = useCallback(
    (start: CellCoords, end: CellCoords): Record<string, boolean> => {
      const ids: Record<string, boolean> = {};
      const rows = table.getRowModel().rows;
      const visibleColumns = table.getVisibleLeafColumns();

      const startRow = Math.min(start.rowIndex, end.rowIndex);
      const endRow = Math.max(start.rowIndex, end.rowIndex);
      const startCol = Math.min(start.colIndex, end.colIndex);
      const endCol = Math.max(start.colIndex, end.colIndex);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const targetRow = rows[r];
          const targetCol = visibleColumns[c];
          if (targetCol && targetRow && targetCol.id !== "select") {
            ids[`${targetRow.id}_${targetCol.id}`] = true;
          }
        }
      }
      return ids;
    },
    [table]
  );

  const isSelected = (rowId: string, colId: string): boolean => {
    const cellId = `${rowId}_${colId}`;
    const inPermanent = !!selectedCells[cellId];
    const inDrag = !!draggedRange[cellId];

    if (isDragging && Object.keys(draggedRange).length > 0) {
      return isDragAdding ? inPermanent || inDrag : inPermanent && !inDrag;
    }
    return inPermanent;
  };

  const handleCellMouseDown = (
    e: React.MouseEvent,
    cell: Cell<Volunteer, unknown>,
    rowIndex: number,
    colIndex: number
  ): void => {
    if (cell.column.id === "select") return;
    if (e.button !== 0) return;

    e.stopPropagation();
    setIsDragging(true);
    setDragStartCell({ rowIndex, colIndex });
    setDraggedRange({});

    const cellId = `${cell.row.id}_${cell.column.id}`;
    const isCurrentlySelected = selectedCells[cellId];

    if (e.shiftKey && lastClickedCell) {
      const newRange = getCellIdsInRange(lastClickedCell, {
        rowIndex,
        colIndex,
      });
      setSelectedCells(newRange);
      setIsDragAdding(true);
    } else if (e.metaKey || e.ctrlKey) {
      setLastClickedCell({ rowIndex, colIndex });
      const shouldAdd = !isCurrentlySelected;
      setIsDragAdding(shouldAdd);
      setDraggedRange({ [cellId]: true });
    } else {
      setLastClickedCell({ rowIndex, colIndex });
      setIsDragAdding(true);
      setSelectedCells({ [cellId]: true });
    }
  };

  const handleCellMouseEnter = (
    e: React.MouseEvent,
    cell: Cell<Volunteer, unknown>,
    rowIndex: number,
    colIndex: number
  ): void => {
    if (!isDragging || !dragStartCell) return;
    if (cell.column.id === "select") return;

    const rangeIds = getCellIdsInRange(dragStartCell, { rowIndex, colIndex });

    if (e.metaKey || e.ctrlKey) {
      setDraggedRange(rangeIds);
    } else {
      setSelectedCells(rangeIds);
    }
  };

  useEffect(() => {
    const handleWindowMouseUp = (): void => {
      if (isDragging) {
        const range = draggedRangeRef.current;
        const hasDraggedRange = Object.keys(range).length > 0;

        if (hasDraggedRange) {
          const currentSelected = { ...selectedCellsRef.current };
          const isAdding = isDragAddingRef.current;

          Object.keys(range).forEach((id) => {
            if (isAdding) currentSelected[id] = true;
            else delete currentSelected[id];
          });
          setSelectedCells(currentSelected);
        }
      }
      setIsDragging(false);
      setDragStartCell(null);
      setDraggedRange({});
    };

    window.addEventListener("mouseup", handleWindowMouseUp);
    return (): void =>
      window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [isDragging]);

  useEffect(() => {
    const isEditableElement = (el: EventTarget | Element | null): boolean => {
      if (!el) return false;
      const element = el as HTMLElement;
      const tagName = element.tagName;
      if (!tagName) return false;

      const editableTags = ["INPUT", "TEXTAREA", "SELECT"];
      if (editableTags.includes(tagName)) return true;
      if (element.isContentEditable) return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (
        isEditableElement(e.target as Element | null) ||
        isEditableElement(document.activeElement)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        const selectedIds = Object.keys(selectedCells).filter(
          (k) => selectedCells[k]
        );
        if (selectedIds.length === 0) return;

        e.preventDefault();
        const rowsMap = new Map<
          string,
          { colIndex: number; value: string }[]
        >();
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

        const clipboardString = sortedRowIds
          .map((rowId) => {
            const cells = rowsMap.get(rowId) || [];
            cells.sort((a, b) => a.colIndex - b.colIndex);
            return cells.map((c) => c.value).join("\t");
          })
          .join("\n");

        navigator.clipboard
          .writeText(clipboardString)
          .catch((err) => console.error(err));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCells, table]);

  const resetSelection = useCallback(() => {
    setSelectedCells({});
    setDraggedRange({});
    setDragStartCell(null);
    setLastClickedCell(null);
  }, []);

  return {
    selectedCells,
    isDragging,
    isSelected,
    handleCellMouseDown,
    handleCellMouseEnter,
    resetSelection,
  };
};
