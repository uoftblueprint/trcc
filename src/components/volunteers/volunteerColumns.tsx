import React from "react";
import { ColumnDef, CellContext } from "@tanstack/react-table";
import { Volunteer } from "./types";
import { VolunteerTag } from "./VolunteerTag";
import { HeaderWithIcon } from "./HeaderWithIcon";
import { EditableCell } from "./EditableCell";
import { NotesDisplay } from "./NotesDisplay";
import {
  CaseSensitive,
  Hash,
  User,
  AtSign,
  Phone,
  List,
  TextAlignStart,
  Bell,
  ToggleLeft,
} from "lucide-react";
import type { CustomColumnRow } from "@/lib/api/customColumns";
import { sanitizeHiddenColumnIds } from "@/lib/volunteerTable/columnVisibility";
import {
  CUSTOM_COLUMN_ID_PREFIX,
  tableIdForCustomColumn,
  parseCustomColumnTableId,
  orderedColumnIds,
} from "@/lib/volunteerTable/columnOrder";

export {
  CUSTOM_COLUMN_ID_PREFIX,
  tableIdForCustomColumn,
  parseCustomColumnTableId,
  orderedColumnIds,
};

type FilterType = "text" | "options" | null;

export interface ColumnConfig {
  id: keyof Volunteer;
  label: string;
  icon: React.ElementType;
  filterType: FilterType;
  isMulti?: boolean;
  size: number;
  cell?: (info: CellContext<Volunteer, unknown>) => React.JSX.Element;
  accessorFn?: (row: Volunteer) => unknown;
}

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

const renderSingleTag = (
  info: CellContext<Volunteer, unknown>
): React.JSX.Element => {
  const value = info.getValue();
  if (!value) return <></>;
  return <VolunteerTag label={String(value)} />;
};

export const COLUMNS_CONFIG: ColumnConfig[] = [
  {
    id: "volunteer_id" as keyof Volunteer,
    label: "ID",
    icon: Hash,
    filterType: null,
    size: 100,
    accessorFn: (row: Volunteer): number => row.id,
    cell: (info: CellContext<Volunteer, unknown>): React.JSX.Element => (
      <span className="text-gray-500 text-xs">{String(info.getValue())}</span>
    ),
  },
  {
    id: "name_org",
    label: "Full Name",
    icon: CaseSensitive,
    filterType: "text",
    size: 140,
  },
  {
    id: "pseudonym",
    label: "Pseudonym",
    icon: CaseSensitive,
    filterType: "text",
    size: 150,
  },
  {
    id: "pronouns",
    label: "Pronouns",
    icon: User,
    filterType: "options",
    isMulti: false,
    size: 120,
    cell: renderSingleTag,
  },
  {
    id: "email",
    label: "Email",
    icon: AtSign,
    filterType: "text",
    size: 200,
  },
  {
    id: "phone",
    label: "Phone",
    icon: Phone,
    filterType: "text",
    size: 140,
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
    icon: Bell,
    filterType: "options",
    isMulti: false,
    size: 150,
    accessorFn: (row: Volunteer): string | null => {
      if (row.opt_in_communication === true) return "Yes";
      if (row.opt_in_communication === false) return "No";
      return null;
    },
    cell: renderSingleTag,
  },
  {
    id: "notes",
    label: "Notes",
    icon: TextAlignStart,
    filterType: null,
    size: 200,
    cell: (info: CellContext<Volunteer, unknown>): React.JSX.Element => (
      <NotesDisplay value={info.getValue()} />
    ),
  },
];

/** Table columns shown in the New Volunteer form (excludes server-assigned ID). */
export const NEW_VOLUNTEER_FORM_COLUMNS = COLUMNS_CONFIG.filter(
  (col) => col.id !== ("volunteer_id" as keyof Volunteer)
);

export type FilterableColumnDesc = {
  id: string;
  label: string;
  type: "text" | "options" | "number";
  icon: React.ElementType;
  isMulti: boolean;
};

export const FILTERABLE_COLUMNS: FilterableColumnDesc[] = COLUMNS_CONFIG.filter(
  (col) => col.filterType !== null
).map((col) => ({
  id: String(col.id),
  label: col.label,
  type: col.filterType as "text" | "options",
  icon: col.icon,
  isMulti: col.isMulti ?? false,
}));

export const FUNDAMENTAL_COLUMN_IDS = [
  "volunteer_id",
  "name_org",
  "email",
  "phone",
] as const;

export function getVolunteerCustomDataMap(
  v: Volunteer
): Record<string, unknown> {
  const cd = v.custom_data;
  if (cd && typeof cd === "object" && !Array.isArray(cd)) {
    return cd as Record<string, unknown>;
  }
  return {};
}

/** Same rules as undo/save: compares one custom_data value to the server baseline. */
export function editedCustomValueMatchesOriginal(
  originalVal: unknown,
  editedVal: unknown
): boolean {
  if (Array.isArray(editedVal) && Array.isArray(originalVal)) {
    return (
      JSON.stringify([...(editedVal as string[])].sort()) ===
      JSON.stringify([...(originalVal as string[])].sort())
    );
  }
  if (Array.isArray(editedVal) || Array.isArray(originalVal)) {
    return false;
  }
  if (typeof editedVal === "boolean" || typeof originalVal === "boolean") {
    return editedVal === originalVal;
  }
  if (typeof editedVal === "number" || typeof originalVal === "number") {
    return editedVal === originalVal;
  }
  const norm = (v: unknown): string =>
    v === null || v === undefined ? "" : String(v);
  return norm(editedVal) === norm(originalVal);
}

/** True if this custom column key is part of the edit overlay and differs from the row baseline. */
export function isCustomColumnCellModified(
  originalRow: Volunteer,
  customKey: string,
  edit: Partial<Volunteer> | undefined
): boolean {
  if (
    !edit?.custom_data ||
    typeof edit.custom_data !== "object" ||
    Array.isArray(edit.custom_data)
  ) {
    return false;
  }
  const m = edit.custom_data as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(m, customKey)) return false;
  const origVal = getVolunteerCustomDataMap(originalRow)[customKey];
  return !editedCustomValueMatchesOriginal(origVal, m[customKey]);
}

export function customColumnIcon(dataType: string): React.ElementType {
  if (dataType === "number") return Hash;
  if (dataType === "boolean") return ToggleLeft;
  if (dataType === "tag") return List;
  return CaseSensitive;
}

export function buildFilterableColumnList(
  customColumns: CustomColumnRow[]
): FilterableColumnDesc[] {
  const builtIn = FILTERABLE_COLUMNS;
  const custom: FilterableColumnDesc[] = customColumns.map((c) => {
    const id = tableIdForCustomColumn(c.column_key);
    if (c.data_type === "text") {
      return {
        id,
        label: c.name,
        type: "text",
        icon: customColumnIcon(c.data_type),
        isMulti: false,
      };
    }
    if (c.data_type === "number") {
      return {
        id,
        label: c.name,
        type: "number",
        icon: customColumnIcon(c.data_type),
        isMulti: false,
      };
    }
    return {
      id,
      label: c.name,
      type: "options",
      icon: customColumnIcon(c.data_type),
      isMulti: c.data_type === "tag" ? Boolean(c.is_multi) : false,
    };
  });
  return [...builtIn, ...custom];
}

const renderCustomBooleanTag = (
  info: CellContext<Volunteer, unknown>
): React.JSX.Element => {
  const value = info.getValue();
  if (value === true) return <VolunteerTag label="Yes" />;
  if (value === false) return <VolunteerTag label="No" />;
  return <></>;
};

const renderCustomNumber = (
  info: CellContext<Volunteer, unknown>
): React.JSX.Element => {
  const value = info.getValue();
  if (value === null || value === undefined || value === "") return <></>;
  return (
    <span className="tabular-nums text-right block w-full">
      {String(value)}
    </span>
  );
};

export function buildDynamicColumns(
  customColumns: CustomColumnRow[],
  userPrefs: {
    column_order: string[];
    hidden_columns: string[];
    prefs_updated_at?: string | null;
  },
  isAdmin: boolean,
  onEdit?: (rowId: number, colId: string, value: unknown) => void,
  optionsData: Record<string, string[]> = {}
): ColumnDef<Volunteer>[] {
  const builtInIds = COLUMNS_CONFIG.map((c) => String(c.id));
  const hidden = new Set(sanitizeHiddenColumnIds(userPrefs.hidden_columns));

  let ordered = orderedColumnIds(
    builtInIds,
    customColumns,
    userPrefs.column_order,
    userPrefs.prefs_updated_at ?? null
  );

  ordered = ordered.filter((id) => !hidden.has(id));

  const idColumnFirst = "volunteer_id";
  ordered = ordered.filter((id) => id !== idColumnFirst);
  if (!hidden.has(idColumnFirst)) {
    ordered = [idColumnFirst, ...ordered];
  }

  const builtInById = new Map(
    COLUMNS_CONFIG.map((c) => [String(c.id), c] as const)
  );
  const customByKey = new Map(
    customColumns.map((c) => [c.column_key, c] as const)
  );

  const defs: ColumnDef<Volunteer>[] = ordered.map((colId) => {
    const builtIn = builtInById.get(colId);
    if (builtIn) {
      const col = builtIn;
      const isEditable =
        isAdmin &&
        onEdit !== undefined &&
        col.id !== ("volunteer_id" as keyof Volunteer);

      return {
        id: col.id as string,
        header: () => <HeaderWithIcon icon={col.icon} label={col.label} />,
        size: col.size,
        sortDescFirst: false,
        ...(col.accessorFn
          ? { accessorFn: col.accessorFn }
          : { accessorKey: col.id }),

        ...(isEditable && onEdit
          ? {
              cell: (info: CellContext<Volunteer, unknown>) => (
                <EditableCell
                  info={info}
                  onEdit={onEdit}
                  type={col.filterType === "options" ? "options" : "text"}
                  isMulti={col.isMulti ?? false}
                  options={optionsData[col.id as string] || []}
                />
              ),
            }
          : col.cell
            ? { cell: col.cell }
            : {}),
      } as ColumnDef<Volunteer>;
    }

    const customKey = parseCustomColumnTableId(colId);
    const cc = customKey ? customByKey.get(customKey) : undefined;
    if (!cc) {
      return {
        id: colId,
        header: colId,
        size: 120,
      } as ColumnDef<Volunteer>;
    }

    const icon = customColumnIcon(cc.data_type);
    const accessorFn = (row: Volunteer): unknown =>
      getVolunteerCustomDataMap(row)[cc.column_key] ?? null;

    const isEditable = isAdmin && onEdit !== undefined;

    let readCell:
      | ((info: CellContext<Volunteer, unknown>) => React.JSX.Element)
      | undefined;

    if (cc.data_type === "number") {
      readCell = renderCustomNumber;
    } else if (cc.data_type === "boolean") {
      readCell = renderCustomBooleanTag;
    } else if (cc.data_type === "tag") {
      readCell = cc.is_multi ? renderMultiTags : renderSingleTag;
    }

    const editableType =
      cc.data_type === "tag"
        ? "options"
        : cc.data_type === "number"
          ? "number"
          : cc.data_type === "boolean"
            ? "boolean"
            : "text";

    return {
      id: colId,
      header: () => <HeaderWithIcon icon={icon} label={cc.name} />,
      size: 140,
      sortDescFirst: false,
      accessorFn,
      ...(isEditable && onEdit
        ? {
            cell: (info: CellContext<Volunteer, unknown>) => (
              <EditableCell
                info={info}
                onEdit={onEdit}
                type={editableType}
                isMulti={Boolean(cc.is_multi)}
                options={optionsData[colId] || cc.tag_options || []}
                allowAddTags={cc.data_type === "tag"}
              />
            ),
          }
        : readCell
          ? { cell: readCell }
          : {}),
    } as ColumnDef<Volunteer>;
  });

  return defs;
}

/** @deprecated Use buildDynamicColumns with custom columns + preferences */
export const getBaseColumns = (
  isAdmin: boolean = false,
  onEdit?: (rowId: number, colId: string, value: unknown) => void,
  optionsData: Record<string, string[]> = {}
): ColumnDef<Volunteer>[] => {
  return COLUMNS_CONFIG.map((col): ColumnDef<Volunteer> => {
    const isEditable =
      isAdmin &&
      onEdit !== undefined &&
      col.id !== ("volunteer_id" as keyof Volunteer);

    return {
      id: col.id as string,
      header: () => <HeaderWithIcon icon={col.icon} label={col.label} />,
      size: col.size,
      sortDescFirst: false,
      ...(col.accessorFn
        ? { accessorFn: col.accessorFn }
        : { accessorKey: col.id }),

      ...(isEditable && onEdit
        ? {
            cell: (info: CellContext<Volunteer, unknown>) => (
              <EditableCell
                info={info}
                onEdit={onEdit}
                type={col.filterType === "options" ? "options" : "text"}
                isMulti={col.isMulti ?? false}
                options={optionsData[col.id as string] || []}
              />
            ),
          }
        : col.cell
          ? { cell: col.cell }
          : {}),
    } as ColumnDef<Volunteer>;
  });
};
