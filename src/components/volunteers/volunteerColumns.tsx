import React from "react";
import { ColumnDef, CellContext } from "@tanstack/react-table";
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

type FilterType = "text" | "options" | null;

interface ColumnConfig {
  id: keyof Volunteer;
  label: string;
  icon: React.ElementType;
  filterType: FilterType;
  isMulti?: boolean;
  size: number;
  cell?: (info: CellContext<Volunteer, unknown>) => React.JSX.Element;
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

const COLUMNS_CONFIG: ColumnConfig[] = [
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
    id: "position",
    label: "Position",
    icon: User,
    filterType: "options",
    isMulti: false,
    size: 120,
    cell: renderSingleTag,
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
    id: "notes",
    label: "Notes",
    icon: TextAlignStart,
    filterType: null,
    size: 200,
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
  return COLUMNS_CONFIG.map((col) => ({
    accessorKey: col.id,
    header: () => <HeaderWithIcon icon={col.icon} label={col.label} />,
    size: col.size,
    ...(col.cell ? { cell: col.cell } : {}),
  }));
};
