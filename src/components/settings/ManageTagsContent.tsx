"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, Plus, Tag, Trash2, User } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import type { CohortRow, RoleRow } from "@/components/volunteers/types";
import {
  createCohortTagAction,
  createRoleTagAction,
  removeAllCohortTagsAction,
  removeAllRoleTagsAction,
  removeCohortTagAction,
  removeRoleTagAction,
  updateCohortTagAction,
  updateRoleTagAction,
  updateCustomColumnAction,
} from "@/lib/api/actions";
import type { CustomColumnRow } from "@/lib/api/customColumns";

const ROLE_TYPES = [
  { value: "current", label: "Current" },
  { value: "prior", label: "Prior" },
  { value: "future_interest", label: "Future interest" },
] as const;

const COHORT_TERMS = ["Fall", "Spring", "Summer", "Winter"] as const;

const inputClass =
  "rounded-lg border border-gray-200/90 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400";

const selectBase =
  "rounded-lg border border-gray-200/90 bg-white py-2 text-sm text-gray-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400";

/** Kind / Term selects: hide native arrow and show a chevron inset from the right edge. */
const selectKindClass = selectBase + " appearance-none pl-2.5 pr-8";

function KindSelect({
  value,
  onChange,
  widthClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  /** e.g. `max-w-[11rem] w-full` for table rows */
  widthClassName: string;
}): React.JSX.Element {
  return (
    <div className={clsx("relative", widthClassName)}>
      <select
        className={clsx(selectKindClass, "w-full")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ROLE_TYPES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
    </div>
  );
}

function TermSelect({
  value,
  onChange,
  widthClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  widthClassName: string;
}): React.JSX.Element {
  return (
    <div className={clsx("relative", widthClassName)}>
      <select
        className={clsx(selectKindClass, "w-full")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {COHORT_TERMS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
    </div>
  );
}

type RoleDraft = { name: string; type: string };
type CohortDraft = { term: string; year: string };

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
  initialCohorts: CohortRow[];
  /** Custom columns with `data_type === "tag"` — preset options for filters and editors. */
  initialCustomTagColumns?: CustomColumnRow[];
  loadError: string | null;
  /** When set (e.g. from the volunteers table modal), refreshes client data instead of the Next router. */
  onRefresh?: () => void;
  /** Hides the page title; use inside a dialog that already has a heading. */
  embedded?: boolean;
  /** When true (e.g. Manage Tags modal), every section starts collapsed. */
  defaultCollapsed?: boolean;
}

export function ManageTagsContent({
  initialRoles,
  initialCohorts,
  initialCustomTagColumns = [],
  loadError,
  onRefresh,
  embedded = false,
  defaultCollapsed = false,
}: ManageTagsContentProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /** Roles, cohorts, and custom tag blocks all start closed when this is true. */
  const sectionsStartClosed = defaultCollapsed === true || embedded === true;

  const tagColumns = useMemo(
    () => initialCustomTagColumns.filter((c) => c.data_type === "tag"),
    [initialCustomTagColumns]
  );

  const [roles, setRoles] = useState(initialRoles);
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, RoleDraft>>({});
  const [cohortDrafts, setCohortDrafts] = useState<Record<number, CohortDraft>>(
    {}
  );

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleType, setNewRoleType] = useState<string>("current");
  const [newCohortTerm, setNewCohortTerm] =
    useState<(typeof COHORT_TERMS)[number]>("Fall");
  const [newCohortYear, setNewCohortYear] = useState(
    String(new Date().getFullYear())
  );

  const [openRoles, setOpenRoles] = useState(() => !sectionsStartClosed);
  const [openCohorts, setOpenCohorts] = useState(() => !sectionsStartClosed);

  const [tagOptionDrafts, setTagOptionDrafts] = useState<
    Record<number, string[]>
  >({});
  const [newTagOptionByColumnId, setNewTagOptionByColumnId] = useState<
    Record<number, string>
  >({});
  const [openCustomTagById, setOpenCustomTagById] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    setRoles(initialRoles);
  }, [initialRoles]);

  useEffect(() => {
    setCohorts(initialCohorts);
  }, [initialCohorts]);

  /** Keep in-progress edits when `roles` refreshes (e.g. after creating another role). */
  useEffect(() => {
    setRoleDrafts((prev) => {
      const next: Record<number, RoleDraft> = {};
      for (const r of roles) {
        const fromServer: RoleDraft = { name: r.name, type: r.type };
        const p = prev[r.id];
        if (p && (p.name !== fromServer.name || p.type !== fromServer.type)) {
          next[r.id] = p;
        } else {
          next[r.id] = fromServer;
        }
      }
      return next;
    });
  }, [roles]);

  /** Keep in-progress edits when `cohorts` refreshes (e.g. after creating another cohort). */
  useEffect(() => {
    setCohortDrafts((prev) => {
      const next: Record<number, CohortDraft> = {};
      for (const c of cohorts) {
        const fromServer: CohortDraft = {
          term: c.term,
          year: String(c.year),
        };
        const p = prev[c.id];
        if (p && (p.term !== fromServer.term || p.year !== fromServer.year)) {
          next[c.id] = p;
        } else {
          next[c.id] = fromServer;
        }
      }
      return next;
    });
  }, [cohorts]);

  /**
   * When custom tag columns reload, keep local edits that are not yet on the server
   * (e.g. user typed in a cell but did not click “Save option edits” before another action).
   */
  useEffect(() => {
    setTagOptionDrafts((prev) => {
      const next: Record<number, string[]> = {};
      for (const c of tagColumns) {
        const fromServer = [...(c.tag_options ?? [])];
        const p = prev[c.id];
        if (p && JSON.stringify(p) !== JSON.stringify(fromServer)) {
          next[c.id] = p;
        } else {
          next[c.id] = fromServer;
        }
      }
      return next;
    });
  }, [tagColumns]);

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
        type: draft.type,
        is_active: row.is_active,
      });
      if (res.success) {
        toast.success("Role saved");
        refresh();
      } else {
        toast.error(res.error ?? "Could not save role");
        setRoleDrafts((prev) => ({
          ...prev,
          [id]: { name: row.name, type: row.type },
        }));
      }
    });
  };

  const handleDeleteRole = (id: number): void => {
    const row = roles.find((r) => r.id === id);
    if (!row) return;
    if (
      !window.confirm(
        `Delete role "${row.name}" (${row.type})? Volunteer links to this role will be removed if the database is set up to cascade.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await removeRoleTagAction(row.id);
      if (res.success) {
        toast.success("Role removed");
        refresh();
      } else {
        toast.error(res.error ?? "Could not remove role");
        setRoleDrafts((prev) => ({
          ...prev,
          [id]: { name: row.name, type: row.type },
        }));
      }
    });
  };

  const handleCreateRole = (e: React.FormEvent): void => {
    e.preventDefault();
    const name = newRoleName.trim();
    if (!name) {
      toast.error("Enter a role name");
      return;
    }
    startTransition(async () => {
      const res = await createRoleTagAction({
        name,
        type: newRoleType,
        is_active: true,
      });
      if (res.success) {
        toast.success("Role created");
        setNewRoleName("");
        setNewRoleType("current");
        refresh();
      } else {
        toast.error(res.error ?? "Could not create role");
      }
    });
  };

  const handleSaveCohort = (id: number): void => {
    const draft = cohortDrafts[id];
    const row = cohorts.find((c) => c.id === id);
    if (!draft || !row) return;
    const y = parseInt(draft.year.trim(), 10);
    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      toast.error("Enter a valid year (1900–2100)");
      return;
    }
    startTransition(async () => {
      const res = await updateCohortTagAction(id, {
        term: draft.term,
        year: y,
        is_active: row.is_active,
      });
      if (res.success) {
        toast.success("Cohort saved");
        refresh();
      } else {
        toast.error(res.error ?? "Could not save cohort");
        setCohortDrafts((prev) => ({
          ...prev,
          [id]: { term: row.term, year: String(row.year) },
        }));
      }
    });
  };

  const handleDeleteCohort = (id: number): void => {
    const row = cohorts.find((c) => c.id === id);
    if (!row) return;
    if (
      !window.confirm(
        `Delete cohort "${row.term} ${row.year}"? Volunteer links may be removed if the database cascades deletes.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await removeCohortTagAction(row.year, row.term);
      if (res.success) {
        toast.success("Cohort removed");
        refresh();
      } else {
        toast.error(res.error ?? "Could not remove cohort");
        setCohortDrafts((prev) => ({
          ...prev,
          [id]: { term: row.term, year: String(row.year) },
        }));
      }
    });
  };

  const handleRemoveAllRoles = (): void => {
    if (roles.length === 0) return;
    if (
      !window.confirm(
        "Remove all roles? This cannot be undone. Links between volunteers and these roles will be deleted."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await removeAllRoleTagsAction();
      if (res.success) {
        toast.success(
          res.removed === 0
            ? "No roles to remove"
            : `Removed ${res.removed} role(s)`
        );
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleRemoveAllCohorts = (): void => {
    if (cohorts.length === 0) return;
    if (
      !window.confirm(
        "Remove all cohorts? This cannot be undone. Links between volunteers and these cohorts will be deleted."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await removeAllCohortTagsAction();
      if (res.success) {
        toast.success(
          res.removed === 0
            ? "No cohorts to remove"
            : `Removed ${res.removed} cohort(s)`
        );
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleCreateCohort = (e: React.FormEvent): void => {
    e.preventDefault();
    const y = parseInt(newCohortYear.trim(), 10);
    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      toast.error("Enter a valid year (1900–2100)");
      return;
    }
    startTransition(async () => {
      const res = await createCohortTagAction({
        term: newCohortTerm,
        year: y,
        is_active: true,
      });
      if (res.success) {
        toast.success("Cohort created");
        setNewCohortYear(String(new Date().getFullYear()));
        refresh();
      } else {
        toast.error(res.error ?? "Could not create cohort");
      }
    });
  };

  const roleDirty = (id: number): boolean => {
    const row = roles.find((r) => r.id === id);
    const d = roleDrafts[id];
    if (!row || !d) return false;
    return row.name !== d.name || row.type !== d.type;
  };

  const cohortDirty = (id: number): boolean => {
    const row = cohorts.find((c) => c.id === id);
    const d = cohortDrafts[id];
    if (!row || !d) return false;
    const y = parseInt(d.year, 10);
    return row.term !== d.term || row.year !== y;
  };

  const tagColumnDirty = (columnId: number): boolean => {
    const col = tagColumns.find((c) => c.id === columnId);
    const draft = tagOptionDrafts[columnId];
    if (!col || draft === undefined) return false;
    return JSON.stringify(col.tag_options ?? []) !== JSON.stringify(draft);
  };

  const handleSaveTagColumnOptions = (columnId: number): void => {
    const draft = tagOptionDrafts[columnId];
    if (draft === undefined) return;
    startTransition(async () => {
      const res = await updateCustomColumnAction(columnId, {
        tag_options: draft,
      });
      if (res.success) {
        toast.success("Tag options saved");
        refresh();
      } else {
        toast.error(res.error ?? "Could not save tag options");
      }
    });
  };

  const handleRemoveTagOptionAt = (columnId: number, index: number): void => {
    const draft = [...(tagOptionDrafts[columnId] ?? [])];
    draft.splice(index, 1);
    setTagOptionDrafts((prev) => ({ ...prev, [columnId]: draft }));
    startTransition(async () => {
      const res = await updateCustomColumnAction(columnId, {
        tag_options: draft,
      });
      if (res.success) {
        toast.success("Option removed");
        refresh();
      } else {
        toast.error(res.error ?? "Could not update options");
        const col = tagColumns.find((c) => c.id === columnId);
        setTagOptionDrafts((prev) => ({
          ...prev,
          [columnId]: [...(col?.tag_options ?? [])],
        }));
      }
    });
  };

  const handleAddCustomTagOption = (
    e: React.FormEvent,
    columnId: number
  ): void => {
    e.preventDefault();
    const raw = (newTagOptionByColumnId[columnId] ?? "").trim();
    if (!raw) {
      toast.error("Enter a tag option");
      return;
    }
    const prev = [...(tagOptionDrafts[columnId] ?? [])];
    if (prev.some((p) => p.toLowerCase() === raw.toLowerCase())) {
      toast.error("That option already exists");
      return;
    }
    const draft = [...prev, raw];
    setTagOptionDrafts((p) => ({ ...p, [columnId]: draft }));
    setNewTagOptionByColumnId((p) => ({ ...p, [columnId]: "" }));
    startTransition(async () => {
      const res = await updateCustomColumnAction(columnId, {
        tag_options: draft,
      });
      if (res.success) {
        toast.success("Option added");
        refresh();
      } else {
        toast.error(res.error ?? "Could not add option");
        setTagOptionDrafts((p) => ({
          ...p,
          [columnId]: prev,
        }));
      }
    });
  };

  const isCustomTagSectionOpen = (columnId: number): boolean =>
    openCustomTagById[columnId] ?? !sectionsStartClosed;

  const toggleCustomTagSection = (columnId: number): void => {
    setOpenCustomTagById((prev) => ({
      ...prev,
      [columnId]: !(prev[columnId] ?? !sectionsStartClosed),
    }));
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

      <CollapsibleSection
        sectionId="manage-tags-roles"
        title="Roles"
        subtitle="Prior, current, and future-interest labels"
        icon={User}
        count={roles.length}
        open={openRoles}
        onToggle={() => setOpenRoles((o) => !o)}
        embedded={embedded}
      >
        <div className="overflow-x-auto rounded-xl border border-gray-200/90 bg-white shadow-inner shadow-gray-100/80">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100/70 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200/90">
              <tr>
                <th className="px-3 py-2.5 pl-4">Name</th>
                <th className="px-3 py-2.5">Kind</th>
                <th className="px-3 py-2.5 pr-4 text-right whitespace-nowrap w-[1%] min-w-48">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/90 bg-white">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10">
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-gray-500">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <Tag className="h-5 w-5" aria-hidden />
                      </span>
                      <p className="text-sm font-medium text-gray-600">
                        No roles yet
                      </p>
                      <p className="text-xs text-gray-500 max-w-xs">
                        Add a role below — it will appear in filters and when
                        editing volunteers.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                roles.map((r) => {
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
                              [r.id]: { ...d, name: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <KindSelect
                          value={d.type}
                          onChange={(next) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [r.id]: { ...d, type: next },
                            }))
                          }
                          widthClassName="w-full max-w-[11rem] min-w-0"
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
                            title="Remove role"
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
            Add a role
          </p>
          <form
            onSubmit={handleCreateRole}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="flex flex-col gap-1 flex-1 min-w-40">
              <label className="text-xs font-medium text-gray-600">Name</label>
              <input
                type="text"
                className={inputClass + " w-full"}
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Greeter"
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-44">
              <label className="text-xs font-medium text-gray-600">Kind</label>
              <KindSelect
                value={newRoleType}
                onChange={setNewRoleType}
                widthClassName="w-full"
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
            disabled={roles.length === 0 || isPending}
            onClick={handleRemoveAllRoles}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200/90 bg-white px-3 py-1.5 text-xs font-medium text-red-800 shadow-sm hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Remove all roles
          </button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="manage-tags-cohorts"
        title="Cohorts"
        subtitle="Term + year (e.g. Fall 2025)"
        icon={Calendar}
        count={cohorts.length}
        open={openCohorts}
        onToggle={() => setOpenCohorts((o) => !o)}
        embedded={embedded}
      >
        <div className="overflow-x-auto rounded-xl border border-gray-200/90 bg-white shadow-inner shadow-gray-100/80">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100/70 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200/90">
              <tr>
                <th className="px-3 py-2.5 pl-4">Term</th>
                <th className="px-3 py-2.5 w-28">Year</th>
                <th className="px-3 py-2.5 pr-4 text-right whitespace-nowrap w-[1%] min-w-48">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/90 bg-white">
              {cohorts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10">
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-gray-500">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <Calendar className="h-5 w-5" aria-hidden />
                      </span>
                      <p className="text-sm font-medium text-gray-600">
                        No cohorts yet
                      </p>
                      <p className="text-xs text-gray-500 max-w-xs">
                        Create a cohort below to use it when linking volunteers.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                cohorts.map((c) => {
                  const d = cohortDrafts[c.id];
                  if (!d) return null;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-purple-50/25 transition-colors"
                    >
                      <td className="px-3 py-2.5 pl-4 align-middle">
                        <TermSelect
                          value={d.term}
                          onChange={(next) =>
                            setCohortDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...d, term: next },
                            }))
                          }
                          widthClassName="w-full max-w-[9rem] min-w-0"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          type="number"
                          min={1900}
                          max={2100}
                          className={inputClass + " w-28 tabular-nums"}
                          value={d.year}
                          onChange={(e) =>
                            setCohortDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...d, year: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 pr-4 align-middle text-right whitespace-nowrap w-[1%]">
                        <div className="inline-flex flex-nowrap items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isPending || !cohortDirty(c.id)}
                            onClick={() => handleSaveCohort(c.id)}
                            className="shrink-0 rounded-lg bg-accent-purple px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-dark-accent-purple disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDeleteCohort(c.id)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200/90 bg-white px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            title="Remove cohort"
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
            Add a cohort
          </p>
          <form
            onSubmit={handleCreateCohort}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="flex flex-col gap-1 w-full sm:w-40">
              <label className="text-xs font-medium text-gray-600">Term</label>
              <TermSelect
                value={newCohortTerm}
                onChange={(next) =>
                  setNewCohortTerm(next as (typeof COHORT_TERMS)[number])
                }
                widthClassName="w-full"
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-28">
              <label className="text-xs font-medium text-gray-600">Year</label>
              <input
                type="number"
                min={1900}
                max={2100}
                className={inputClass + " w-full tabular-nums"}
                value={newCohortYear}
                onChange={(e) => setNewCohortYear(e.target.value)}
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
            disabled={cohorts.length === 0 || isPending}
            onClick={handleRemoveAllCohorts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200/90 bg-white px-3 py-1.5 text-xs font-medium text-red-800 shadow-sm hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Remove all cohorts
          </button>
        </div>
      </CollapsibleSection>

      {tagColumns.map((col) => {
        const opts = tagOptionDrafts[col.id] ?? [];
        return (
          <CollapsibleSection
            key={col.id}
            sectionId={`manage-tags-custom-tag-${col.id}`}
            title={col.name}
            subtitle={
              col.is_multi
                ? "Preset options for this multi-select tag column"
                : "Preset options for this tag column"
            }
            icon={Tag}
            count={opts.length}
            open={isCustomTagSectionOpen(col.id)}
            onToggle={() => toggleCustomTagSection(col.id)}
            embedded={embedded}
          >
            <div className="overflow-x-auto rounded-xl border border-gray-200/90 bg-white shadow-inner shadow-gray-100/80">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100/70 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200/90">
                  <tr>
                    <th className="px-3 py-2.5 pl-4">Option</th>
                    <th className="px-3 py-2.5 pr-4 text-right whitespace-nowrap w-[1%] min-w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/90 bg-white">
                  {opts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-8">
                        <p className="text-sm text-gray-500 text-center">
                          No preset options yet. Add one below or type new
                          values in the table when editing volunteers.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    opts.map((opt, index) => (
                      <tr
                        key={`${col.id}-opt-${index}`}
                        className="hover:bg-purple-50/25 transition-colors"
                      >
                        <td className="px-3 py-2.5 pl-4 align-middle">
                          <input
                            type="text"
                            className={inputClass + " w-full min-w-32"}
                            value={opt}
                            onChange={(e) => {
                              const next = [...(tagOptionDrafts[col.id] ?? [])];
                              next[index] = e.target.value;
                              setTagOptionDrafts((prev) => ({
                                ...prev,
                                [col.id]: next,
                              }));
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5 pr-4 align-middle text-right whitespace-nowrap w-[1%]">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleRemoveTagOptionAt(col.id, index)
                            }
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200/90 bg-white px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            title="Remove option"
                          >
                            <Trash2
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-dashed border-purple-200/70 bg-purple-50/25 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-900/80 mb-3">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add option
              </p>
              <form
                onSubmit={(e) => handleAddCustomTagOption(e, col.id)}
                className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-40">
                  <label className="text-xs font-medium text-gray-600">
                    Label
                  </label>
                  <input
                    type="text"
                    className={inputClass + " w-full"}
                    value={newTagOptionByColumnId[col.id] ?? ""}
                    onChange={(e) =>
                      setNewTagOptionByColumnId((prev) => ({
                        ...prev,
                        [col.id]: e.target.value,
                      }))
                    }
                    placeholder="e.g. Small"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-purple px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-purple-900/10 hover:bg-dark-accent-purple disabled:opacity-50 sm:shrink-0"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200/80 pt-3 mt-3">
              <button
                type="button"
                disabled={isPending || !tagColumnDirty(col.id)}
                onClick={() => handleSaveTagColumnOptions(col.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-purple px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-dark-accent-purple disabled:opacity-40"
              >
                Save option edits
              </button>
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
