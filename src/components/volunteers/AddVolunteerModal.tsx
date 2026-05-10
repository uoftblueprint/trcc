"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { X, UserPlus } from "lucide-react";
import clsx from "clsx";
import { createVolunteerAction } from "@/lib/api/actions";
import { NEW_VOLUNTEER_FORM_COLUMNS } from "./volunteerColumns";
import type { Volunteer } from "./types";
import { VolunteerTag } from "./VolunteerTag";
import { OPT_IN_OPTIONS } from "./utils";

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
    title: "Training",
    description:
      "Add any text labels (same idea as Position). Suggestions come from tags your admins created.",
    columnIds: ["cohorts"],
  },
  {
    title: "Position, committee, and language",
    columnIds: ["prior_roles", "current_roles", "future_interests"],
  },
  {
    title: "Preferences & notes",
    columnIds: ["opt_in_communication", "notes"],
  },
];

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
            values.length > 0 ? "Add another…" : "Type a tag, then press Enter"
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

export const AddVolunteerModal = ({
  isOpen,
  onClose,
  onSuccess,
  optionsData = {},
}: AddVolunteerModalProps): React.JSX.Element | null => {
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
  const [trainingRoles, setTrainingRoles] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pronounOptions = optionsData["pronouns"] ?? [];
  const currentRoleOptions = optionsData["current_roles"] ?? [];
  const priorRoleOptions = optionsData["prior_roles"] ?? [];
  const futureRoleOptions = optionsData["future_interests"] ?? [];
  const trainingTagOptions = optionsData["cohorts"] ?? [];

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
    setTrainingRoles([]);
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

    const roles = [
      ...trainingRoles.map((name) => ({
        name: name.trim(),
        type: "training" as const,
      })),
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
        cohorts: [],
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
          <MultiRoleField
            key={col.id}
            label={col.label}
            icon={col.icon}
            options={trainingTagOptions}
            values={trainingRoles}
            onChange={setTrainingRoles}
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
                  Add multiple training terms and tags if you need them. You can
                  add more later by editing the volunteer.
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
