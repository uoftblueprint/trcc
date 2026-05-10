"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronDown,
  GraduationCap,
  Languages,
  Plus,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import type { RoleRow } from "@/components/volunteers/types";
import {
  createRoleTagAction,
  removeRoleTagAction,
  updateRoleTagAction,
} from "@/lib/api/actions";
import {
  ROLE_TAG_COLUMN_LABEL,
  roleTagColumnLabel,
  type RoleTagDbType,
} from "@/lib/volunteers/roleTagLabels";

const ROLE_TAG_SECTIONS: {
  type: RoleTagDbType;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  {
    type: "training",
    title: "Training",
    subtitle: "Free-text tags shown in the Training column",
    icon: GraduationCap,
  },
  {
    type: "prior",
    title: "Position",
    subtitle: "Tags shown in the Position column",
    icon: Briefcase,
  },
  {
    type: "current",
    title: "Committee",
    subtitle: "Tags shown in the Committee column",
    icon: Users,
  },
  {
    type: "future_interest",
    title: "Language",
    subtitle: "Tags shown in the Language column",
    icon: Languages,
  },
];

const inputClass =
  "rounded-lg border border-gray-200/90 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400";

type RoleDraft = { name: string };

function CollapsibleSection({
  sectionId,
  title,
  subtitle,
  icon: Icon,
  count,
  open,
  onToggle,
  children,
  embedded = false,
}: {
  sectionId: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  embedded?: boolean;
}): React.JSX.Element {
  const panelId = `${sectionId}-panel`;
  const headerId = `${sectionId}-header`;
  return (
    <section
      className={clsx(
        "rounded-2xl overflow-hidden transition-shadow",
        embedded
          ? "border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-100/80"
          : "border border-gray-200 bg-white shadow-sm"
      )}
    >
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={clsx(
          "flex w-full items-center gap-3 px-4 py-3.5 sm:px-5 text-left transition-colors",
          embedded ? "hover:bg-purple-50/50" : "hover:bg-gray-50/90",
          open && embedded && "bg-purple-50/30"
        )}
      >
        <span
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            embedded
              ? "bg-purple-100/90 text-purple-700"
              : "bg-gray-100 text-gray-700"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-gray-900">
              {title}
            </span>
            {count !== undefined ? (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
                {count}
              </span>
            ) : null}
          </span>
          {subtitle ? (
            <span className="mt-0.5 block text-xs text-gray-500 leading-snug">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={clsx(
            "h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className={clsx(
            "border-t border-gray-100/90 px-4 pb-4 pt-1 sm:px-5 space-y-4",
            embedded && "bg-gray-50/40"
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

interface ManageTagsContentProps {
  initialRoles: RoleRow[];
  loadError: string | null;
  /** When set (e.g. from the volunteers table modal), refreshes client data instead of the Next router. */
  onRefresh?: () => void;
  /** Hides the page title; use inside a dialog that already has a heading. */
  embedded?: boolean;
}

export function ManageTagsContent({
  initialRoles,
  loadError,
  onRefresh,
  embedded = false,
}: ManageTagsContentProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [roles, setRoles] = useState(initialRoles);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, RoleDraft>>({});

  const [newTagNameByType, setNewTagNameByType] = useState<
    Record<RoleTagDbType, string>
  >({
    training: "",
    prior: "",
    current: "",
    future_interest: "",
  });

  const [openRoleSection, setOpenRoleSection] = useState<
    Record<RoleTagDbType, boolean>
  >({
    training: true,
    prior: true,
    current: true,
    future_interest: true,
  });

  useEffect(() => {
    setRoles(initialRoles);
  }, [initialRoles]);

  useEffect(() => {
    setRoleDrafts(
      Object.fromEntries(roles.map((r) => [r.id, { name: r.name }]))
    );
  }, [roles]);

  const refresh = (): void => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  };

  const handleSaveRole = (id: number): void => {
    const draft = roleDrafts[id];
    const row = roles.find((r) => r.id === id);
    if (!draft || !row) return;
    startTransition(async () => {
      const res = await updateRoleTagAction(id, {
        name: draft.name,
        type: row.type,
        is_active: row.is_active,
      });
      if (res.success) {
        toast.success("Tag saved");
        refresh();
      } else {
        toast.error(res.error ?? "Could not save tag");
        setRoleDrafts((prev) => ({
          ...prev,
          [id]: { name: row.name },
        }));
      }
    });
  };

  const handleDeleteRole = (id: number): void => {
    const row = roles.find((r) => r.id === id);
    if (!row) return;
    if (
      !window.confirm(
        `Delete tag "${row.name}" (${roleTagColumnLabel(row.type)})? Volunteer links to this tag will be removed if the database is set up to cascade.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await removeRoleTagAction(row.id);
      if (res.success) {
        toast.success("Tag removed");
        refresh();
      } else {
        toast.error(res.error ?? "Could not remove tag");
        setRoleDrafts((prev) => ({
          ...prev,
          [id]: { name: row.name },
        }));
      }
    });
  };

  const handleCreateRoleForType = (
    e: React.FormEvent,
    type: RoleTagDbType
  ): void => {
    e.preventDefault();
    const name = newTagNameByType[type].trim();
    if (!name) {
      toast.error("Enter a tag name");
      return;
    }
    startTransition(async () => {
      const res = await createRoleTagAction({
        name,
        type,
        is_active: true,
      });
      if (res.success) {
        toast.success("Tag created");
        setNewTagNameByType((prev) => ({ ...prev, [type]: "" }));
        refresh();
      } else {
        toast.error(res.error ?? "Could not create tag");
      }
    });
  };

  const handleRemoveAllRolesForType = (type: RoleTagDbType): void => {
    const inColumn = roles.filter((r) => r.type === type);
    if (inColumn.length === 0) return;
    const label = ROLE_TAG_COLUMN_LABEL[type];
    if (
      !window.confirm(
        `Remove all ${label} tags (${inColumn.length})? This cannot be undone. Links between volunteers and these tags will be removed if the database cascades deletes.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      for (const r of inColumn) {
        const res = await removeRoleTagAction(r.id);
        if (!res.success) {
          toast.error(res.error ?? `Could not remove tag "${r.name}"`);
          refresh();
          return;
        }
      }
      toast.success(
        `Removed ${inColumn.length} ${label} tag${inColumn.length === 1 ? "" : "s"}`
      );
      refresh();
    });
  };

  const roleDirty = (id: number): boolean => {
    const row = roles.find((r) => r.id === id);
    const d = roleDrafts[id];
    if (!row || !d) return false;
    return row.name !== d.name;
  };

  if (loadError) {
    return (
      <div className="max-w-prose">
        {!embedded ? (
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Volunteer tags
          </h1>
        ) : null}
        <p className="text-gray-600 leading-relaxed">
          Could not load tags: {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? "max-w-none space-y-3" : "max-w-4xl space-y-6"}>
      {!embedded ? (
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Volunteer tags
        </h1>
      ) : null}

      {ROLE_TAG_SECTIONS.map(({ type, title, subtitle, icon: SectionIcon }) => {
        const columnRoles = roles
          .filter((r) => r.type === type)
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
        return (
          <CollapsibleSection
            key={type}
            sectionId={`manage-tags-${type}`}
            title={title}
            subtitle={subtitle}
            icon={SectionIcon}
            count={columnRoles.length}
            open={openRoleSection[type]}
            onToggle={() =>
              setOpenRoleSection((prev) => ({
                ...prev,
                [type]: !prev[type],
              }))
            }
            embedded={embedded}
          >
            <div className="overflow-x-auto rounded-xl border border-gray-200/90 bg-white shadow-inner shadow-gray-100/80">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100/70 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-300">
                  <tr>
                    <th className="px-3 py-2.5 pl-4">Name</th>
                    <th className="px-3 py-2.5 pr-4 text-right whitespace-nowrap w-[1%] min-w-48">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-white">
                  {columnRoles.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-10">
                        <div className="flex flex-col items-center justify-center gap-2 text-center text-gray-500">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <Tag className="h-5 w-5" aria-hidden />
                          </span>
                          <p className="text-sm font-medium text-gray-600">
                            No {title.toLowerCase()} tags yet
                          </p>
                          <p className="text-xs text-gray-500 max-w-xs">
                            Add a tag below — it will appear in filters and when
                            editing volunteers.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    columnRoles.map((r) => {
                      const d = roleDrafts[r.id];
                      if (!d) return null;
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-purple-50/25 transition-colors"
                        >
                          <td className="px-3 py-2.5 pl-4 align-middle">
                            <input
                              type="text"
                              className={inputClass + " w-full min-w-32"}
                              value={d.name}
                              onChange={(e) =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [r.id]: { name: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-2.5 pr-4 align-middle text-right whitespace-nowrap w-[1%]">
                            <div className="inline-flex flex-nowrap items-center justify-end gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={isPending || !roleDirty(r.id)}
                                onClick={() => handleSaveRole(r.id)}
                                className="shrink-0 rounded-lg bg-accent-purple px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-dark-accent-purple disabled:opacity-40"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeleteRole(r.id)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200/90 bg-white px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                title="Remove tag"
                              >
                                <Trash2
                                  className="h-3.5 w-3.5 shrink-0"
                                  aria-hidden
                                />
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-dashed border-purple-200/70 bg-purple-50/25 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-900/80 mb-3">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add {title.toLowerCase()} tag
              </p>
              <form
                onSubmit={(e) => handleCreateRoleForType(e, type)}
                className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-40">
                  <label className="text-xs font-medium text-gray-600">
                    Name
                  </label>
                  <input
                    type="text"
                    className={inputClass + " w-full"}
                    value={newTagNameByType[type]}
                    onChange={(e) =>
                      setNewTagNameByType((prev) => ({
                        ...prev,
                        [type]: e.target.value,
                      }))
                    }
                    placeholder={"Type here"}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-purple px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-purple-900/10 hover:bg-dark-accent-purple disabled:opacity-50 sm:shrink-0"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Create
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200/80 pt-3 mt-3">
              <button
                type="button"
                disabled={columnRoles.length === 0 || isPending}
                onClick={() => handleRemoveAllRolesForType(type)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200/90 bg-white px-3 py-1.5 text-xs font-medium text-red-800 shadow-sm hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Remove all {title.toLowerCase()} tags
              </button>
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
