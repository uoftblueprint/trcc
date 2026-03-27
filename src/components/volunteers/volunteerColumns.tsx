import React, { useState, useCallback } from "react";
import { ColumnDef, CellContext, type RowData } from "@tanstack/react-table";
import { Volunteer } from "./types";
import { VolunteerTag } from "./VolunteerTag";
import { HeaderWithIcon } from "./HeaderWithIcon";
import {
  CaseSensitive,
  User,
  AtSign,
  Phone,
  List,
  TextAlignStart,
} from "lucide-react";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    onCellEdit?: (
      volunteerId: string,
      columnId: string,
      value: unknown
    ) => void;
    pendingEdits?: Record<string, Record<string, unknown>>;
  }
}

type FilterType = "text" | "options" | null;

interface ColumnConfig {
  id: keyof Volunteer;
  label: string;
  icon: React.ElementType;
  filterType: FilterType;
  isMulti?: boolean;
  size: number;
  editable?: boolean;
  editType?: "text" | "select" | "bool-select";
  selectOptions?: string[];
  cell?: (info: CellContext<Volunteer, unknown>) => React.JSX.Element;
  accessorFn?: (row: Volunteer) => unknown;
}

const POSITION_OPTIONS = ["", "member", "volunteer", "staff"];

const renderMultiTags = (
  info: CellContext<Volunteer, unknown>
): React.JSX.Element => {
  const value = info.getValue();
  if (!Array.isArray(value)) return <></>;
  return (
    <div
      className={
        "flex flex-wrap gap-1 max-h-20 overflow-y-auto " +
        "[scrollbar-width:none] [-ms-overflow-style:none] " +
        "[&::-webkit-scrollbar]:hidden"
      }
    >
      {value.map((tag, i) => (
        <VolunteerTag key={i} label={String(tag)} />
      ))}
    </div>
  );
};

function EditableTextCell(
  info: CellContext<Volunteer, unknown>
): React.JSX.Element {
  const volunteerId = String(info.row.original.id);
  const columnId = info.column.id;
  const meta = info.table.options.meta;

  const pendingVal = meta?.pendingEdits?.[volunteerId]?.[columnId];
  const originalVal = info.getValue() as string | null;
  const displayVal =
    pendingVal !== undefined ? (pendingVal as string | null) : originalVal;
  const isDirty = pendingVal !== undefined;

  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const startEditing = useCallback(() => {
    setInputVal(displayVal ?? "");
    setEditing(true);
  }, [displayVal]);

  const onBlur = useCallback(() => {
    setEditing(false);
    const trimmed = inputVal.trim();
    const newVal = trimmed === "" ? null : trimmed;
    meta?.onCellEdit?.(volunteerId, columnId, newVal);
  }, [inputVal, meta, volunteerId, columnId]);

  if (editing) {
    return (
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        className="w-full border border-purple-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
      onKeyDown={(e) => e.key === "Enter" && startEditing()}
      className={`cursor-text min-h-6 rounded px-1 -mx-1 truncate ${
        isDirty ? "bg-yellow-50 ring-1 ring-yellow-300" : ""
      }`}
      title="Click to edit"
    >
      {displayVal ?? <span className="text-gray-400 italic text-xs">—</span>}
    </div>
  );
}

function EditableSelectCell(
  info: CellContext<Volunteer, unknown>
): React.JSX.Element {
  const volunteerId = String(info.row.original.id);
  const columnId = info.column.id;
  const meta = info.table.options.meta;

  const pendingVal = meta?.pendingEdits?.[volunteerId]?.[columnId];
  const originalVal = info.getValue() as string | null;
  const currentVal =
    pendingVal !== undefined ? (pendingVal as string | null) : originalVal;
  const isDirty = pendingVal !== undefined;

  const col = COLUMNS_CONFIG.find((c) => c.id === columnId);
  const options = col?.selectOptions ?? [];

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      const val = e.target.value === "" ? null : e.target.value;
      meta?.onCellEdit?.(volunteerId, columnId, val);
    },
    [meta, volunteerId, columnId]
  );

  return (
    <select
      value={currentVal ?? ""}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={`w-full rounded px-1 py-0.5 text-sm border focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer ${
        isDirty
          ? "bg-yellow-50 border-yellow-300"
          : "bg-transparent border-transparent hover:border-gray-300"
      }`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === "" ? "—" : opt}
        </option>
      ))}
    </select>
  );
}

function EditableBoolSelectCell(
  info: CellContext<Volunteer, unknown>
): React.JSX.Element {
  const volunteerId = String(info.row.original.id);
  const meta = info.table.options.meta;

  const pendingVal =
    meta?.pendingEdits?.[volunteerId]?.["opt_in_communication"];
  const rawBool =
    pendingVal !== undefined
      ? (pendingVal as boolean | null)
      : info.row.original.opt_in_communication;

  const selectVal =
    rawBool === true ? "true" : rawBool === false ? "false" : "";
  const isDirty = pendingVal !== undefined;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      const val =
        e.target.value === "true"
          ? true
          : e.target.value === "false"
            ? false
            : null;
      meta?.onCellEdit?.(volunteerId, "opt_in_communication", val);
    },
    [meta, volunteerId]
  );

  return (
    <select
      value={selectVal}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={`w-full rounded px-1 py-0.5 text-sm border focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer ${
        isDirty
          ? "bg-yellow-50 border-yellow-300"
          : "bg-transparent border-transparent hover:border-gray-300"
      }`}
    >
      <option value="">—</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

const COLUMNS_CONFIG: ColumnConfig[] = [
  {
    id: "name_org",
    label: "Full Name",
    icon: CaseSensitive,
    filterType: "text",
    size: 140,
    editable: true,
    editType: "text",
    cell: EditableTextCell,
  },
  {
    id: "pseudonym",
    label: "Pseudonym",
    icon: CaseSensitive,
    filterType: "text",
    size: 150,
    editable: true,
    editType: "text",
    cell: EditableTextCell,
  },
  {
    id: "pronouns",
    label: "Pronouns",
    icon: User,
    filterType: "options",
    isMulti: false,
    size: 120,
    editable: true,
    editType: "text",
    cell: EditableTextCell,
  },
  {
    id: "email",
    label: "Email",
    icon: AtSign,
    filterType: "text",
    size: 200,
    editable: true,
    editType: "text",
    cell: EditableTextCell,
  },
  {
    id: "phone",
    label: "Phone",
    icon: Phone,
    filterType: "text",
    size: 140,
    editable: true,
    editType: "text",
    cell: EditableTextCell,
  },
  {
    id: "position",
    label: "Position",
    icon: User,
    filterType: "options",
    isMulti: false,
    size: 130,
    editable: true,
    editType: "select",
    selectOptions: POSITION_OPTIONS,
    cell: EditableSelectCell,
  },
  {
    id: "cohorts",
    label: "Cohort",
    icon: List,
    filterType: "options",
    isMulti: true,
    size: 150,
    cell: renderMultiTags,
  },
  {
    id: "prior_roles",
    label: "Prior Role",
    icon: User,
    filterType: "options",
    isMulti: true,
    size: 180,
    cell: renderMultiTags,
  },
  {
    id: "current_roles",
    label: "Current Role",
    icon: User,
    filterType: "options",
    isMulti: true,
    size: 180,
    cell: renderMultiTags,
  },
  {
    id: "future_interests",
    label: "Future Interest",
    icon: User,
    filterType: "options",
    isMulti: true,
    size: 180,
    cell: renderMultiTags,
  },
  {
    id: "opt_in_communication",
    label: "Opt-In Communication",
    icon: Phone,
    filterType: "options",
    isMulti: false,
    size: 160,
    editable: true,
    editType: "bool-select",
    accessorFn: (row: Volunteer): string | null => {
      if (row.opt_in_communication === true) return "Yes";
      if (row.opt_in_communication === false) return "No";
      return null;
    },
    cell: EditableBoolSelectCell,
  },
  {
    id: "notes",
    label: "Notes",
    icon: TextAlignStart,
    filterType: null,
    size: 200,
    editable: true,
    editType: "text",
    cell: EditableTextCell,
  },
];

export const FILTERABLE_COLUMNS = COLUMNS_CONFIG.filter(
  (col) => col.filterType !== null
).map((col) => ({
  id: col.id,
  label: col.label,
  type: col.filterType as "text" | "options",
  icon: col.icon,
  isMulti: col.isMulti ?? false,
}));

export const getBaseColumns = (): ColumnDef<Volunteer>[] => {
  return COLUMNS_CONFIG.map(
    (col): ColumnDef<Volunteer> => ({
      id: col.id,
      header: () => <HeaderWithIcon icon={col.icon} label={col.label} />,
      size: col.size,
      ...(col.accessorFn
        ? { accessorFn: col.accessorFn }
        : { accessorKey: col.id }),
      ...(col.cell ? { cell: col.cell } : {}),
    })
  );
};
