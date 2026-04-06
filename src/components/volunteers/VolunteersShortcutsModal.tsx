"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Phone,
  Mail,
  UserPlus,
  Copy,
  SlidersHorizontal,
  Users,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Volunteer } from "./types";
import { createVolunteerAction } from "@/lib/api/actions";
import {
  buildPhoneFormatBulkEdits,
  collectVisibleEmailsCommaSeparated,
  collectVisiblePhonesCommaSeparated,
  findVolunteerDuplicateClusters,
  parseBatchVolunteerLines,
  volunteerLabelById,
} from "./volunteersShortcutsUtils";

type BulkShortcutField =
  | "opt_in_communication"
  | "pronouns"
  | "pseudonym"
  | "notes";

type ShortcutSectionId =
  | "formatPhones"
  | "copyEmails"
  | "copyPhones"
  | "bulkField"
  | "duplicates"
  | "missingContact"
  | "batchCreate";

const INITIAL_SECTION_OPEN: Record<ShortcutSectionId, boolean> = {
  formatPhones: false,
  copyEmails: false,
  copyPhones: false,
  bulkField: false,
  duplicates: false,
  missingContact: false,
  batchCreate: false,
};

type SectionIcon = React.ComponentType<{ className?: string }>;

function CollapsibleShortcutsSection({
  sectionId,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  contentClassName = "gap-2",
  children,
}: {
  sectionId: ShortcutSectionId;
  title: string;
  icon: SectionIcon;
  isOpen: boolean;
  onToggle: () => void;
  contentClassName?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const labelId = `shortcuts-section-${sectionId}`;
  return (
    <section
      className="rounded-lg border border-gray-100"
      aria-labelledby={labelId}
    >
      <button
        type="button"
        id={labelId}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left transition-colors hover:bg-gray-50/80"
        onClick={onToggle}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          {title}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-gray-400"
            aria-hidden
          />
        )}
      </button>
      {isOpen ? (
        <div
          className={`flex flex-col border-t border-gray-100 px-4 pb-4 pt-3 ${contentClassName}`}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export interface VolunteersShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  /** Rows currently shown in the table (filters, search, pagination). */
  visibleVolunteers: Volunteer[];
  /** Full volunteer list for global duplicate scan and row labels. */
  allVolunteers: Volunteer[];
  /** Checkbox-selected rows (may span current page only). */
  selectedVolunteers: Volunteer[];
  onBulkEdit: (
    edits: Array<{ rowId: number; colId: string; value: unknown }>
  ) => void;
  onRefresh: () => void | Promise<void>;
  onJumpToVolunteerRow: (volunteerId: number) => void;
  onApplyMissingEmailFilter: () => void;
  onApplyMissingPhoneFilter: () => void;
  onApplyMissingEmailOrPhoneFilter: () => void;
  /** Same ordering as the table filter / cell editor (predefined + values in data). */
  pronounOptions: string[];
}

export const VolunteersShortcutsModal = ({
  isOpen,
  onClose,
  isAdmin,
  visibleVolunteers,
  allVolunteers,
  selectedVolunteers,
  onBulkEdit,
  onRefresh,
  onJumpToVolunteerRow,
  onApplyMissingEmailFilter,
  onApplyMissingPhoneFilter,
  onApplyMissingEmailOrPhoneFilter,
  pronounOptions,
}: VolunteersShortcutsModalProps): React.JSX.Element | null => {
  const [batchText, setBatchText] = useState("");
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    ok: number;
    fail: number;
    errors: string[];
  } | null>(null);

  const [bulkField, setBulkField] = useState<BulkShortcutField>(
    "opt_in_communication"
  );
  const [bulkOptIn, setBulkOptIn] = useState<"Yes" | "No">("Yes");
  const [bulkPronouns, setBulkPronouns] = useState<string>("");
  const [bulkText, setBulkText] = useState("");

  const [duplicateScope, setDuplicateScope] = useState<"view" | "global">(
    "view"
  );

  const [openSections, setOpenSections] =
    useState<Record<ShortcutSectionId, boolean>>(INITIAL_SECTION_OPEN);

  useEffect(() => {
    if (!isOpen) return;
    setOpenSections({ ...INITIAL_SECTION_OPEN });
  }, [isOpen]);

  const toggleSection = (id: ShortcutSectionId): void => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (!isOpen || !pronounOptions.length) return;
    setBulkPronouns((prev) => {
      if (prev === "__clear__") return prev;
      return pronounOptions.includes(prev) ? prev : pronounOptions[0]!;
    });
  }, [pronounOptions, isOpen]);

  const resetBatch = (): void => {
    setBatchText("");
    setBatchResult(null);
  };

  const handleClose = (): void => {
    resetBatch();
    onClose();
  };

  const handleFormatPhones = (): void => {
    const edits = buildPhoneFormatBulkEdits(visibleVolunteers);
    if (edits.length === 0) {
      toast(
        "No 10- or 11-digit (NANP) phone numbers in the current view needed formatting."
      );
      return;
    }
    onBulkEdit(edits);
    toast.success(
      `Staged phone formatting for ${edits.length} row${edits.length === 1 ? "" : "s"}. Save to apply.`
    );
  };

  const handleCopyEmails = async (): Promise<void> => {
    const text = collectVisibleEmailsCommaSeparated(visibleVolunteers);
    if (!text) {
      toast("No emails in the current view.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Emails copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const handleCopyPhones = async (): Promise<void> => {
    const text = collectVisiblePhonesCommaSeparated(visibleVolunteers);
    if (!text) {
      toast("No phone numbers in the current view.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Phone numbers copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const handleBatchCreate = async (): Promise<void> => {
    const rows = parseBatchVolunteerLines(batchText);
    if (rows.length === 0) {
      toast("Add at least one line with a name or organization.");
      return;
    }

    setBatchSubmitting(true);
    setBatchResult(null);
    let ok = 0;
    let fail = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const result = await createVolunteerAction({
          volunteer: {
            name_org: row.name_org,
            email: row.email,
            phone: row.phone,
            pronouns: null,
            pseudonym: null,
            opt_in_communication: false,
            notes: null,
          },
          roles: [],
          cohorts: [],
        });
        if (result.success) {
          ok += 1;
        } else {
          fail += 1;
          const label = row.name_org.slice(0, 40);
          errors.push(`Line ${i + 1} (${label}): ${result.error}`);
        }
      }

      setBatchResult({ ok, fail, errors: errors.slice(0, 12) });
      if (ok > 0) {
        toast.success(`Created ${ok} volunteer${ok === 1 ? "" : "s"}.`);
        await onRefresh();
      }
      if (fail > 0) {
        toast.error(`${fail} row${fail === 1 ? "" : "s"} failed.`);
      }
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleApplyBulkField = (): void => {
    if (selectedVolunteers.length === 0) {
      toast(
        "Select one or more rows in the table (checkbox column), then try again."
      );
      return;
    }

    const edits: Array<{ rowId: number; colId: string; value: unknown }> = [];

    if (bulkField === "opt_in_communication") {
      for (const v of selectedVolunteers) {
        edits.push({
          rowId: v.id,
          colId: "opt_in_communication",
          value: bulkOptIn,
        });
      }
    } else if (bulkField === "pronouns") {
      if (pronounOptions.length === 0) {
        toast.error("No pronoun options are available.");
        return;
      }
      const val =
        bulkPronouns === "__clear__"
          ? null
          : pronounOptions.includes(bulkPronouns)
            ? bulkPronouns
            : pronounOptions[0]!;
      for (const v of selectedVolunteers) {
        edits.push({ rowId: v.id, colId: "pronouns", value: val });
      }
    } else {
      const trimmed = bulkText.trim();
      const val = trimmed === "" ? null : trimmed;
      for (const v of selectedVolunteers) {
        edits.push({ rowId: v.id, colId: bulkField, value: val });
      }
    }

    onBulkEdit(edits);
    toast.success(
      `Staged ${bulkField.replace(/_/g, " ")} for ${selectedVolunteers.length} row${selectedVolunteers.length === 1 ? "" : "s"}. Save to apply.`
    );
  };

  const duplicateSource =
    duplicateScope === "view" ? visibleVolunteers : allVolunteers;
  const duplicateClusters = useMemo(
    () => findVolunteerDuplicateClusters(duplicateSource),
    [duplicateSource]
  );
  const labelVolunteers = allVolunteers;

  if (!isOpen) return null;

  const visibleCount = visibleVolunteers.length;
  const selectedCount = selectedVolunteers.length;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/25 z-40"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
            <h2
              id="shortcuts-modal-title"
              className="text-sm font-semibold text-gray-900"
            >
              Shortcuts
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-5 overflow-y-auto">
            <p className="text-xs text-gray-500">
              Most clipboard actions use volunteers{" "}
              <span className="font-medium text-gray-700">
                currently visible in the table
              </span>{" "}
              ({visibleCount} row{visibleCount === 1 ? "" : "s"}), including
              search and filters. Paginated rows not on this page are not
              included unless noted.
            </p>

            <CollapsibleShortcutsSection
              sectionId="formatPhones"
              title="Format phone numbers"
              icon={Phone}
              isOpen={openSections.formatPhones}
              onToggle={() => toggleSection("formatPhones")}
            >
              <p className="text-xs text-gray-600">
                Normalizes 10- and 11-digit NANP numbers to{" "}
                <span className="font-mono text-[11px]">(555) 123-4567</span> as
                pending edits. Use <span className="font-medium">Save</span> in
                the toolbar to write to the database.
              </p>
              <button
                type="button"
                onClick={handleFormatPhones}
                disabled={visibleCount === 0}
                className="mt-1 self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-purple-300 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Format phones in view
              </button>
            </CollapsibleShortcutsSection>

            <CollapsibleShortcutsSection
              sectionId="copyEmails"
              title="Copy all emails"
              icon={Mail}
              isOpen={openSections.copyEmails}
              onToggle={() => toggleSection("copyEmails")}
            >
              <p className="text-xs text-gray-600">
                Copies non-empty emails from the current view, comma-separated,
                in the same order as the sorted table and with filters applied.
              </p>
              <button
                type="button"
                onClick={() => void handleCopyEmails()}
                disabled={visibleCount === 0}
                className="mt-1 self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-purple-300 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Copy all emails
              </button>
            </CollapsibleShortcutsSection>

            <CollapsibleShortcutsSection
              sectionId="copyPhones"
              title="Copy all phone numbers"
              icon={Copy}
              isOpen={openSections.copyPhones}
              onToggle={() => toggleSection("copyPhones")}
            >
              <p className="text-xs text-gray-600">
                Copies non-empty phone numbers from the current view,
                comma-separated, in the same order as the sorted table and with
                filters applied.
              </p>
              <button
                type="button"
                onClick={() => void handleCopyPhones()}
                disabled={visibleCount === 0}
                className="mt-1 self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-purple-300 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Copy all phone numbers
              </button>
            </CollapsibleShortcutsSection>

            {isAdmin && (
              <CollapsibleShortcutsSection
                sectionId="bulkField"
                title="Set field on selected rows"
                icon={SlidersHorizontal}
                isOpen={openSections.bulkField}
                onToggle={() => toggleSection("bulkField")}
                contentClassName="gap-3"
              >
                <p className="text-xs text-gray-600">
                  Select rows with the checkbox column, choose a field and
                  value, then stage edits for all selected rows. Use{" "}
                  <span className="font-medium">Save</span> to persist.
                </p>
                <p className="text-xs font-medium text-gray-700">
                  Selected: {selectedCount} row{selectedCount === 1 ? "" : "s"}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    Field
                    <select
                      value={bulkField}
                      onChange={(e) =>
                        setBulkField(e.target.value as BulkShortcutField)
                      }
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
                    >
                      <option value="opt_in_communication">
                        Opt-in communication
                      </option>
                      <option value="pronouns">Pronouns</option>
                      <option value="pseudonym">Pseudonym</option>
                      <option value="notes">Notes</option>
                    </select>
                  </label>
                  {bulkField === "opt_in_communication" && (
                    <label className="flex flex-col gap-1 text-xs text-gray-600">
                      Value
                      <select
                        value={bulkOptIn}
                        onChange={(e) =>
                          setBulkOptIn(e.target.value as "Yes" | "No")
                        }
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </label>
                  )}
                  {bulkField === "pronouns" && (
                    <label className="flex flex-col gap-1 text-xs text-gray-600">
                      Value
                      <select
                        value={
                          bulkPronouns === "__clear__" ||
                          pronounOptions.includes(bulkPronouns)
                            ? bulkPronouns
                            : (pronounOptions[0] ?? "")
                        }
                        onChange={(e) => setBulkPronouns(e.target.value)}
                        disabled={pronounOptions.length === 0}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:opacity-50"
                      >
                        {pronounOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                        <option value="__clear__">— Clear —</option>
                      </select>
                    </label>
                  )}
                  {(bulkField === "pseudonym" || bulkField === "notes") && (
                    <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-gray-600">
                      Value (empty clears)
                      <input
                        type="text"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyBulkField}
                    disabled={selectedCount === 0}
                    className="rounded-lg bg-accent-purple px-3 py-2 text-sm font-medium text-white hover:bg-dark-accent-purple disabled:opacity-50"
                  >
                    Stage for selected
                  </button>
                </div>
              </CollapsibleShortcutsSection>
            )}

            <CollapsibleShortcutsSection
              sectionId="duplicates"
              title="Find duplicates"
              icon={Users}
              isOpen={openSections.duplicates}
              onToggle={() => toggleSection("duplicates")}
              contentClassName="gap-3"
            >
              <p className="text-xs text-gray-600">
                Same email (case-insensitive, trimmed) or same phone (digits
                only, 7+ digits). The links below jump to the correct page and
                row in the table for the volunteer with duplicated email or
                phone number.
                <br />
                Below, you will only see volunteers currently in the table (with
                filters applied).
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="dup-scope"
                    checked={duplicateScope === "view"}
                    onChange={() => setDuplicateScope("view")}
                    className="rounded-full border-gray-300 text-purple-600 focus:ring-purple-200"
                  />
                  Current view ({visibleCount} rows)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="dup-scope"
                    checked={duplicateScope === "global"}
                    onChange={() => setDuplicateScope("global")}
                    className="rounded-full border-gray-300 text-purple-600 focus:ring-purple-200"
                  />
                  All volunteers ({allVolunteers.length} rows)
                </label>
              </div>
              {duplicateClusters.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No duplicate groups found.
                </p>
              ) : (
                <ul className="flex max-h-48 flex-col gap-3 overflow-y-auto text-xs">
                  {duplicateClusters.map((cluster) => (
                    <li
                      key={`${cluster.kind}-${cluster.key}`}
                      className="rounded-md border border-gray-100 bg-gray-50/80 p-2"
                    >
                      <div className="font-medium text-gray-800">
                        {cluster.kind === "email" ? "Email" : "Phone"}:{" "}
                        <span className="break-all font-mono text-[11px]">
                          {cluster.key}
                        </span>
                      </div>
                      <ul className="mt-1.5 flex list-none flex-col gap-1 pl-0">
                        {cluster.volunteerIds.map((id) => (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => onJumpToVolunteerRow(id)}
                              className="text-left text-purple-700 hover:text-purple-900 hover:underline"
                            >
                              {volunteerLabelById(labelVolunteers, id)} (id {id}
                              )
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleShortcutsSection>

            <CollapsibleShortcutsSection
              sectionId="missingContact"
              title="Find volunteers with missing email or phone"
              icon={Filter}
              isOpen={openSections.missingContact}
              onToggle={() => toggleSection("missingContact")}
            >
              <p className="text-xs text-gray-600">
                Adds a server filter (combined with your existing opt-in filter
                using AND). Closes this panel so you can work in the table.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={onApplyMissingEmailFilter}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-purple-300 hover:bg-gray-50"
                >
                  Filter: missing email
                </button>
                <button
                  type="button"
                  onClick={onApplyMissingPhoneFilter}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-purple-300 hover:bg-gray-50"
                >
                  Filter: missing phone
                </button>
                <button
                  type="button"
                  onClick={onApplyMissingEmailOrPhoneFilter}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-purple-300 hover:bg-gray-50"
                >
                  Filter: missing email or phone
                </button>
              </div>
            </CollapsibleShortcutsSection>

            <CollapsibleShortcutsSection
              sectionId="batchCreate"
              title="Create many volunteers at once"
              icon={UserPlus}
              isOpen={openSections.batchCreate}
              onToggle={() => toggleSection("batchCreate")}
            >
              <p className="text-xs text-gray-600">
                One volunteer per line, fields separated by{" "}
                <span className="font-bold">commas</span>. Example:{" "}
                <span className="font-mono font-medium italic text-[11px]">
                  name, email, phone
                </span>
                . If the second value has no{" "}
                <span className="font-mono">@</span>, it is stored as phone.
                Avoid commas inside names. New volunteers have no roles or
                cohorts until you edit them.
              </p>
              <textarea
                value={batchText}
                onChange={(e) => {
                  setBatchText(e.target.value);
                  setBatchResult(null);
                }}
                rows={6}
                placeholder={
                  "first, first@mail.com, 4371234567\nsecond, 6471239876\nthird"
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => void handleBatchCreate()}
                disabled={batchSubmitting || !batchText.trim()}
                className="self-start rounded-lg bg-accent-purple px-3 py-2 text-sm font-medium text-white hover:bg-dark-accent-purple disabled:opacity-50"
              >
                {batchSubmitting ? "Creating…" : "Create volunteers"}
              </button>
              {batchResult && (
                <div className="space-y-1 text-xs text-gray-600">
                  <p>
                    <span className="font-medium text-green-700">
                      {batchResult.ok} created
                    </span>
                    {batchResult.fail > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-medium text-red-700">
                          {batchResult.fail} failed
                        </span>
                      </>
                    )}
                  </p>
                  {batchResult.errors.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-4 text-red-700">
                      {batchResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CollapsibleShortcutsSection>
          </div>
        </div>
      </div>
    </>
  );
};
