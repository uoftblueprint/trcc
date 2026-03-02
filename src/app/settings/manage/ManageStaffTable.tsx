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
  memberType: "Admin" | "Staff" | "Member" | "Viewer";
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

const MEMBER_TYPES: StaffRow["memberType"][] = [
  "Admin",
  "Staff",
  "Member",
  "Viewer",
];

const columnHelper = createColumnHelper<StaffRow>();

const defaultData: StaffRow[] = Array.from({ length: 6 }, (_, i) => ({
  id: `staff-${i + 1}`,
  name: "First Last Name",
  email: "alicesmith@gmail.com",
  password: "password",
  memberType: "Admin",
}));

function EditableCell({
  getValue,
  row,
  column,
  table,
}: {
  getValue: () => string;
  row: { index: number };
  column: { id: string };
  table: {
    options: {
      meta?: {
        updateData?: (
          rowIndex: number,
          columnId: string,
          value: unknown
        ) => void;
      };
    };
  };
}): React.JSX.Element {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);

  const startEditing = useCallback(() => {
    setValue(getValue());
    setEditing(true);
  }, [getValue]);

  const onBlur = useCallback(() => {
    setEditing(false);
    table.options.meta?.updateData?.(row.index, column.id, value);
  }, [row.index, column.id, value, table.options.meta]);

  if (editing) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) =>
          e.key === "Enter" && (e.target as HTMLInputElement).blur()
        }
        autoFocus
        style={{
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "inherit",
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
      style={{ cursor: "text", minHeight: "24px" }}
    >
      {getValue() || " "}
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
  row: { index: number };
  column: { id: string };
  table: {
    options: {
      meta?: {
        updateData?: (
          rowIndex: number,
          columnId: string,
          value: unknown
        ) => void;
      };
    };
  };
}): React.JSX.Element {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);

  const startEditing = useCallback(() => {
    setValue(getValue());
    setEditing(true);
  }, [getValue]);

  const onBlur = useCallback(() => {
    setEditing(false);
    table.options.meta?.updateData?.(row.index, column.id, value);
  }, [row.index, column.id, value, table.options.meta]);

  if (editing) {
    return (
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) =>
          e.key === "Enter" && (e.target as HTMLInputElement).blur()
        }
        autoFocus
        style={{
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "inherit",
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
      style={{ cursor: "text", minHeight: "24px" }}
    >
      {getValue() || " "}
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
  row: { index: number };
  column: { id: string };
  table: {
    options: {
      meta?: {
        updateData?: (
          rowIndex: number,
          columnId: string,
          value: unknown
        ) => void;
      };
    };
  };
}): React.JSX.Element {
  const value = getValue();

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
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "inherit",
        backgroundColor: "#fff",
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

type ManageStaffTableProps = {
  initialData?: StaffRow[];
};

export function ManageStaffTable({
  initialData,
}: ManageStaffTableProps): React.JSX.Element {
  const [data, setData] = useState<StaffRow[]>(
    () => initialData ?? defaultData
  );

  const updateData = useCallback(
    (rowIndex: number, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row, i) =>
          i === rowIndex ? { ...row, [columnId]: value } : row
        )
      );
    },
    []
  );

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
    meta: { updateData },
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
