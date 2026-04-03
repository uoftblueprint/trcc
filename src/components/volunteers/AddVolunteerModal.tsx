"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { X, UserPlus } from "lucide-react";
import clsx from "clsx";
import { createVolunteerAction } from "@/lib/api/actions";
import type { CohortTerm } from "@/lib/api/createVolunteer";
import { NEW_VOLUNTEER_FORM_COLUMNS } from "./volunteerColumns";
import type { Volunteer } from "./types";
import { VolunteerTag } from "./VolunteerTag";
import { OPT_IN_OPTIONS } from "./utils";

const COHORT_TERMS: CohortTerm[] = ["Fall", "Winter", "Spring", "Summer"];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition " +
  "focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500";

const selectClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500";

interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  optionsData?: Record<string, string[]>;
}

const FORM_SECTIONS: {
  title: string;
  description?: string;
  columnIds: readonly (keyof Volunteer)[];
}[] = [
  {
    title: "Profile",
    description:
      "Name is required. Everything else helps your team recognize this volunteer.",
    columnIds: ["name_org", "pseudonym", "pronouns", "email", "phone"],
  },
  {
    title: "Cohorts",
    columnIds: ["cohorts"],
  },
  {
    title: "Roles",
    columnIds: ["prior_roles", "current_roles", "future_interests"],
  },
  {
    title: "Preferences & notes",
    columnIds: ["opt_in_communication", "notes"],
  },
];

type CohortFormRow = { term: CohortTerm; year: string };

function parseCohortLabel(
  label: string
): { term: CohortTerm; year: string } | null {
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const year = parts[parts.length - 1]!;
  const term = parts.slice(0, -1).join(" ");
  if (!/^\d{4}$/.test(year)) return null;
  if (!COHORT_TERMS.includes(term as CohortTerm)) return null;
  return { term: term as CohortTerm, year };
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-gray-200/90 bg-linear-to-b from-gray-50/90 to-white p-4 sm:p-5 shadow-sm">
      <header className="mb-4 pb-3 border-b border-gray-100/80">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-prose">
            {description}
          </p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  required,
  icon: Icon,
}: {
  children: React.ReactNode;
  required?: boolean;
  icon: React.ElementType;
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100/80 text-purple-700">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span>
        {children}
        {required ? <span className="text-red-500 font-normal"> *</span> : null}
      </span>
    </label>
  );
}

function MultiRoleField({
  label,
  options,
  values,
  onChange,
  icon: Icon,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  icon: React.ElementType;
}): React.JSX.Element {
  const [draft, setDraft] = useState("");
  const datalistId = useId();

  const addDraft = useCallback((): void => {
    const t = draft.trim();
    if (!t) return;
    if (!values.some((v) => v.toLowerCase() === t.toLowerCase())) {
      onChange([...values, t]);
    }
    setDraft("");
  }, [draft, values, onChange]);

  const suggestionOptions = [...new Set(options)].sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel icon={Icon}>{label}</FieldLabel>
      <div
        className={
          "flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 " +
          "bg-white px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/25 focus-within:border-purple-400"
        }
      >
        {values.map((v, i) => (
          <VolunteerTag
            key={`${v}-${i}`}
            label={v}
            onRemove={() => onChange(values.filter((_, idx) => idx !== i))}
          />
        ))}
        <input
          type="text"
          className="flex-1 min-w-40 border-0 bg-transparent py-1 px-1 text-sm outline-none placeholder:text-gray-400"
          placeholder={
            values.length > 0 ? "Add another…" : "Type a role, then Enter"
          }
          value={draft}
          list={suggestionOptions.length > 0 ? datalistId : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
        />
      </div>
      {suggestionOptions.length > 0 ? (
        <datalist id={datalistId}>
          {suggestionOptions.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

function CohortField({
  label,
  icon: Icon,
  cohortLabels,
  cohortRows,
  setCohortRows,
  currentYear,
}: {
  label: string;
  icon: React.ElementType;
  cohortLabels: string[];
  cohortRows: CohortFormRow[];
  setCohortRows: React.Dispatch<React.SetStateAction<CohortFormRow[]>>;
  currentYear: number;
}): React.JSX.Element {
  const [term, setTerm] = useState<CohortTerm>("Fall");
  const [year, setYear] = useState(String(currentYear));

  const addDraft = useCallback((): void => {
    const y = parseInt(year.trim(), 10);
    if (!Number.isInteger(y) || y < 1900 || y > 2100) return;
    const yStr = String(y);
    setCohortRows((rows) => {
      if (rows.some((r) => r.term === term && r.year === yStr)) return rows;
      return [...rows, { term, year: yStr }];
    });
  }, [term, year, setCohortRows]);

  const applyPreset = useCallback(
    (presetLabel: string): void => {
      const parsed = parseCohortLabel(presetLabel);
      if (!parsed) return;
      setCohortRows((rows) => {
        if (
          rows.some((r) => r.term === parsed.term && r.year === parsed.year)
        ) {
          return rows;
        }
        return [...rows, parsed];
      });
    },
    [setCohortRows]
  );

  const removeAt = (index: number): void => {
    setCohortRows((rows) => rows.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel icon={Icon}>{label}</FieldLabel>

      <div
        className={
          "flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 " +
          "bg-white px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/25 focus-within:border-purple-400"
        }
      >
        {cohortRows.map((row, i) => (
          <VolunteerTag
            key={`${row.term}-${row.year}-${i}`}
            label={`${row.term} ${row.year}`}
            onRemove={() => removeAt(i)}
          />
        ))}
        <div className="flex flex-1 min-w-[min(100%,12rem)] flex-wrap items-center gap-2">
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value as CohortTerm)}
            className="rounded-md border border-gray-200 bg-gray-50/80 py-1.5 pl-2 pr-7 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500/30"
            aria-label="Cohort term"
          >
            {COHORT_TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            className="w-24 rounded-md border border-gray-200 bg-gray-50/80 py-1.5 px-2 text-sm tabular-nums outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500/30"
            aria-label="Cohort year"
          />
          <button
            type="button"
            onClick={addDraft}
            className="rounded-md bg-accent-purple px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-dark-accent-purple transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {cohortLabels.length > 0 ? (
        <div className="flex flex-col gap-1.5 pt-0.5">
          <p className="text-xs text-gray-500">Existing tags:</p>
          <div className="flex flex-wrap gap-1.5">
            {cohortLabels.map((presetLabel) => (
              <button
                key={presetLabel}
                type="button"
                onClick={() => applyPreset(presetLabel)}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50/70"
              >
                {presetLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const AddVolunteerModal = ({
  isOpen,
  onClose,
  onSuccess,
  optionsData = {},
}: AddVolunteerModalProps): React.JSX.Element | null => {
  const currentYear = new Date().getFullYear();

  const [nameOrg, setNameOrg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [optInLabel, setOptInLabel] = useState<string>(OPT_IN_OPTIONS[0]!);
  const [notes, setNotes] = useState("");
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [priorRoles, setPriorRoles] = useState<string[]>([]);
  const [futureRoles, setFutureRoles] = useState<string[]>([]);
  const [cohortRows, setCohortRows] = useState<CohortFormRow[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pronounOptions = optionsData["pronouns"] ?? [];
  const currentRoleOptions = optionsData["current_roles"] ?? [];
  const priorRoleOptions = optionsData["prior_roles"] ?? [];
  const futureRoleOptions = optionsData["future_interests"] ?? [];
  const cohortLabels = optionsData["cohorts"] ?? [];

  const resetForm = useCallback((): void => {
    setNameOrg("");
    setEmail("");
    setPhone("");
    setPronouns("");
    setPseudonym("");
    setOptInLabel(OPT_IN_OPTIONS[0]!);
    setNotes("");
    setCurrentRoles([]);
    setPriorRoles([]);
    setFutureRoles([]);
    setCohortRows([]);
    setError(null);
  }, []);

  const handleClose = useCallback((): void => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return (): void => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    for (let i = 0; i < cohortRows.length; i++) {
      const row = cohortRows[i]!;
      const y = parseInt(row.year, 10);
      if (!Number.isInteger(y) || y < 1900 || y > 2100) {
        setError(`Cohort row ${i + 1}: enter a valid year (1900–2100).`);
        return;
      }
    }

    const cohorts = cohortRows.map((row) => ({
      year: parseInt(row.year, 10),
      term: row.term,
    }));

    const roles = [
      ...currentRoles.map((name) => ({
        name: name.trim(),
        type: "current" as const,
      })),
      ...priorRoles.map((name) => ({
        name: name.trim(),
        type: "prior" as const,
      })),
      ...futureRoles.map((name) => ({
        name: name.trim(),
        type: "future_interest" as const,
      })),
    ].filter((r) => r.name.length > 0);

    setSubmitting(true);
    try {
      const result = await createVolunteerAction({
        volunteer: {
          name_org: nameOrg.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          pronouns: pronouns.trim() || null,
          pseudonym: pseudonym.trim() || null,
          opt_in_communication: optInLabel === "Yes",
          notes: notes.trim() || null,
        },
        roles,
        cohorts,
      });

      if (result.success) {
        resetForm();
        onSuccess();
        onClose();
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderField = (
    col: (typeof NEW_VOLUNTEER_FORM_COLUMNS)[number]
  ): React.JSX.Element | null => {
    const id = col.id as keyof Volunteer;

    switch (id) {
      case "name_org":
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <FieldLabel icon={col.icon} required>
              {col.label}
            </FieldLabel>
            <input
              type="text"
              value={nameOrg}
              onChange={(e) => setNameOrg(e.target.value)}
              required
              placeholder="Full Name"
              className={inputClass}
            />
          </div>
        );
      case "pseudonym":
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <FieldLabel icon={col.icon}>{col.label}</FieldLabel>
            <input
              type="text"
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              placeholder="Optional display name"
              className={inputClass}
            />
          </div>
        );
      case "pronouns":
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <FieldLabel icon={col.icon}>{col.label}</FieldLabel>
            <select
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className={selectClass}
            >
              <option value="">Choose…</option>
              {pronounOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        );
      case "email":
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <FieldLabel icon={col.icon}>{col.label}</FieldLabel>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@organization.org"
              className={inputClass}
            />
          </div>
        );
      case "phone":
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <FieldLabel icon={col.icon}>{col.label}</FieldLabel>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        );
      case "cohorts":
        return (
          <CohortField
            key={col.id}
            label={col.label}
            icon={col.icon}
            cohortLabels={cohortLabels}
            cohortRows={cohortRows}
            setCohortRows={setCohortRows}
            currentYear={currentYear}
          />
        );
      case "prior_roles":
        return (
          <MultiRoleField
            key={col.id}
            label={col.label}
            icon={col.icon}
            options={priorRoleOptions}
            values={priorRoles}
            onChange={setPriorRoles}
          />
        );
      case "current_roles":
        return (
          <MultiRoleField
            key={col.id}
            label={col.label}
            icon={col.icon}
            options={currentRoleOptions}
            values={currentRoles}
            onChange={setCurrentRoles}
          />
        );
      case "future_interests":
        return (
          <MultiRoleField
            key={col.id}
            label={col.label}
            icon={col.icon}
            options={futureRoleOptions}
            values={futureRoles}
            onChange={setFutureRoles}
          />
        );
      case "opt_in_communication":
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <FieldLabel icon={col.icon}>{col.label}</FieldLabel>
            <select
              value={optInLabel}
              onChange={(e) => setOptInLabel(e.target.value)}
              className={selectClass}
            >
              {OPT_IN_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        );
      case "notes":
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <FieldLabel icon={col.icon}>{col.label}</FieldLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes…"
              className={clsx(inputClass, "resize-none min-h-20")}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const titleId = "add-volunteer-modal-title";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200/80 w-full max-w-2xl max-h-[min(92vh,52rem)] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="relative shrink-0 px-5 pt-6 pb-4 sm:px-6 border-b border-gray-100 bg-linear-to-r from-purple-50/90 via-white to-white">
            <div className="flex items-start gap-4 pr-10">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-purple text-white shadow-md shadow-purple-900/10">
                <UserPlus className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id={titleId}
                    className="text-lg font-semibold text-gray-900 tracking-tight"
                  >
                    Add a new volunteer
                  </h2>
                </div>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Add multiple cohorts and roles if you need them. You can add
                  more later and edit the volunteer later.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5">
              <SectionCard
                title={FORM_SECTIONS[0]!.title}
                {...(FORM_SECTIONS[0]!.description != null
                  ? { description: FORM_SECTIONS[0]!.description }
                  : {})}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["name_org"] as const).map((fid) => {
                    const col = NEW_VOLUNTEER_FORM_COLUMNS.find(
                      (c) => c.id === fid
                    );
                    return col ? (
                      <div key={fid} className="sm:col-span-2">
                        {renderField(col)}
                      </div>
                    ) : null;
                  })}
                  {(["pseudonym", "pronouns", "email", "phone"] as const).map(
                    (fid) => {
                      const col = NEW_VOLUNTEER_FORM_COLUMNS.find(
                        (c) => c.id === fid
                      );
                      return col ? (
                        <div key={fid}>{renderField(col)}</div>
                      ) : null;
                    }
                  )}
                </div>
              </SectionCard>

              {FORM_SECTIONS.slice(1).map((section) => (
                <SectionCard
                  key={section.title}
                  title={section.title}
                  {...(section.description != null
                    ? { description: section.description }
                    : {})}
                >
                  {section.columnIds.map((columnId) => {
                    const col = NEW_VOLUNTEER_FORM_COLUMNS.find(
                      (c) => c.id === columnId
                    );
                    return col ? renderField(col) : null;
                  })}
                </SectionCard>
              ))}

              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-5 py-4 sm:px-6 border-t border-gray-100 bg-gray-50/80">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto rounded-lg px-5 py-2.5 bg-accent-purple hover:bg-dark-accent-purple text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? "Adding…" : "Add volunteer"}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </>
  );
};
