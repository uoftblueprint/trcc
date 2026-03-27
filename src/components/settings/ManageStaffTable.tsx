"use client";

import React, { useCallback, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type RowData,
} from "@tanstack/react-table";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  memberType: "Admin" | "Staff" | "No role";
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void;
    pendingEdits?: Record<string, Record<string, unknown>>;
  }
}

const MEMBER_TYPES: StaffRow["memberType"][] = ["Admin", "Staff", "No role"];

const columnHelper = createColumnHelper<StaffRow>();

function EditableCell({
  getValue,
  row,
  column,
  table,
}: {
  getValue: () => string;
  row: { index: number; original: StaffRow };
  column: { id: string };
  table: {
    options: {
      meta?: {
        updateData?: (
          rowIndex: number,
          columnId: string,
          value: unknown
        ) => void;
        pendingEdits?: Record<string, Record<string, unknown>>;
      };
    };
  };
}): React.JSX.Element {
  const [inputValue, setValue] = useState("");
  const [editing, setEditing] = useState(false);

  const isDirty =
    table.options.meta?.pendingEdits?.[row.original.id]?.[column.id] !==
    undefined;

  const startEditing = useCallback(() => {
    setValue(getValue());
    setEditing(true);
  }, [getValue]);

  const onBlur = useCallback(() => {
    setEditing(false);
    table.options.meta?.updateData?.(row.index, column.id, inputValue);
  }, [row.index, column.id, inputValue, table.options.meta]);

  if (editing) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        style={{
          width: "100%",
          border: "1px solid #a78bfa",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "inherit",
          outline: "none",
        }}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(e) => e.key === "Enter" && startEditing()}
      style={{
        cursor: "text",
        minHeight: "24px",
        borderRadius: "4px",
        padding: "2px 4px",
        margin: "0 -4px",
        backgroundColor: isDirty ? "#fefce8" : undefined,
        outline: isDirty ? "1px solid #fde047" : undefined,
      }}
      title="Click to edit"
    >
      {getValue() || (
        <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
      )}
    </div>
  );
}

function PasswordCell({
  getValue,
  row,
  column,
  table,
}: {
  getValue: () => string;
  row: { index: number; original: StaffRow };
  column: { id: string };
  table: {
    options: {
      meta?: {
        updateData?: (
          rowIndex: number,
          columnId: string,
          value: unknown
        ) => void;
        pendingEdits?: Record<string, Record<string, unknown>>;
      };
    };
  };
}): React.JSX.Element {
  const [inputValue, setValue] = useState("");
  const [editing, setEditing] = useState(false);

  const isDirty =
    table.options.meta?.pendingEdits?.[row.original.id]?.[column.id] !==
    undefined;

  const startEditing = useCallback(() => {
    setValue(getValue());
    setEditing(true);
  }, [getValue]);

  const onBlur = useCallback(() => {
    setEditing(false);
    // Only register pending edit if the user typed something
    if (inputValue.trim() !== "") {
      table.options.meta?.updateData?.(row.index, column.id, inputValue);
    }
  }, [row.index, column.id, inputValue, table.options.meta]);

  if (editing) {
    return (
      <input
        type="password"
        value={inputValue}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        placeholder="New password (min 6 chars)"
        style={{
          width: "100%",
          border: "1px solid #a78bfa",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "inherit",
          outline: "none",
        }}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(e) => e.key === "Enter" && startEditing()}
      style={{
        cursor: "text",
        minHeight: "24px",
        color: isDirty ? "#713f12" : "#737373",
        borderRadius: "4px",
        padding: "2px 4px",
        margin: "0 -4px",
        backgroundColor: isDirty ? "#fefce8" : undefined,
        outline: isDirty ? "1px solid #fde047" : undefined,
      }}
      title="Click to change password"
    >
      {isDirty ? "••••••••" : "****************"}
    </div>
  );
}

function MemberTypeCell({
  getValue,
  row,
  column,
  table,
}: {
  getValue: () => StaffRow["memberType"];
  row: { index: number; original: StaffRow };
  column: { id: string };
  table: {
    options: {
      meta?: {
        updateData?: (
          rowIndex: number,
          columnId: string,
          value: unknown
        ) => void;
        pendingEdits?: Record<string, Record<string, unknown>>;
      };
    };
  };
}): React.JSX.Element {
  const pendingVal =
    table.options.meta?.pendingEdits?.[row.original.id]?.[column.id];
  const value =
    pendingVal !== undefined
      ? (pendingVal as StaffRow["memberType"])
      : getValue();
  const isDirty = pendingVal !== undefined;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newValue = e.target.value as StaffRow["memberType"];
      table.options.meta?.updateData?.(row.index, column.id, newValue);
    },
    [row.index, column.id, table.options.meta]
  );

  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        border: isDirty ? "1px solid #fde047" : "1px solid #e5e7eb",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "inherit",
        backgroundColor: isDirty ? "#fefce8" : "#fff",
        cursor: "pointer",
      }}
    >
      {MEMBER_TYPES.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
}

export type ManageStaffTableProps = {
  data: StaffRow[];
  pendingEdits: Record<string, Record<string, unknown>>;
  onCellEdit: (rowIndex: number, columnId: string, value: unknown) => void;
};

export function ManageStaffTable({
  data,
  pendingEdits,
  onCellEdit,
}: ManageStaffTableProps): React.JSX.Element {
  const table = useReactTable({
    data,
    columns: [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (ctx) => (
          <EditableCell
            getValue={ctx.getValue}
            row={ctx.row}
            column={ctx.column}
            table={ctx.table}
          />
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (ctx) => (
          <EditableCell
            getValue={ctx.getValue}
            row={ctx.row}
            column={ctx.column}
            table={ctx.table}
          />
        ),
      }),
      columnHelper.accessor("password", {
        header: "Password",
        cell: (ctx) => (
          <PasswordCell
            getValue={ctx.getValue}
            row={ctx.row}
            column={ctx.column}
            table={ctx.table}
          />
        ),
      }),
      columnHelper.accessor("memberType", {
        header: "Member Type",
        cell: (ctx) => (
          <MemberTypeCell
            getValue={ctx.getValue}
            row={ctx.row}
            column={ctx.column}
            table={ctx.table}
          />
        ),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    meta: { updateData: onCellEdit, pendingEdits },
  });

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.875rem",
      }}
    >
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                style={{
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#171717",
                  padding: "0.75rem 1rem",
                  borderBottom: "2px solid #e5e5e5",
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                style={{
                  padding: "0.5rem 1rem",
                  borderBottom: "1px solid #e5e5e5",
                  verticalAlign: "middle",
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
