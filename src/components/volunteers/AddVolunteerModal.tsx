"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { createVolunteerAction } from "@/lib/api/actions";
import type { CohortTerm, RoleType } from "@/lib/api/createVolunteer";

interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_TYPES: { value: RoleType; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "prior", label: "Prior" },
  { value: "future_interest", label: "Future Interest" },
];

const COHORT_TERMS: CohortTerm[] = ["Fall", "Winter", "Spring", "Summer"];

const POSITIONS = ["volunteer", "staff"];

export const AddVolunteerModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddVolunteerModalProps): React.JSX.Element | null => {
  const currentYear = new Date().getFullYear();

  const [nameOrg, setNameOrg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [position, setPosition] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [notes, setNotes] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleType, setRoleType] = useState<RoleType>("current");
  const [cohortYear, setCohortYear] = useState(String(currentYear));
  const [cohortTerm, setCohortTerm] = useState<CohortTerm>("Fall");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = (): void => {
    setNameOrg("");
    setEmail("");
    setPhone("");
    setPronouns("");
    setPseudonym("");
    setPosition("");
    setOptIn(true);
    setNotes("");
    setRoleName("");
    setRoleType("current");
    setCohortYear(String(currentYear));
    setCohortTerm("Fall");
    setError(null);
  };

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    const yearNum = parseInt(cohortYear, 10);
    if (!Number.isInteger(yearNum)) {
      setError("Cohort year must be a valid number.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createVolunteerAction({
        volunteer: {
          name_org: nameOrg.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          pronouns: pronouns.trim() || null,
          pseudonym: pseudonym.trim() || null,
          position: position || null,
          opt_in_communication: optIn,
          notes: notes.trim() || null,
        },
        role: {
          name: roleName.trim(),
          type: roleType,
        },
        cohort: {
          year: yearNum,
          term: cohortTerm,
        },
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

  return (
    <>
      <div
        className="fixed inset-0 bg-black/25 z-40"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              New Volunteer
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Volunteer Info */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Volunteer Info
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nameOrg}
                  onChange={(e) => setNameOrg(e.target.value)}
                  required
                  placeholder="Full name or organization"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="416-555-0100"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Pronouns</label>
                  <input
                    type="text"
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="they/them"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Pseudonym</label>
                  <input
                    type="text"
                    value={pseudonym}
                    onChange={(e) => setPseudonym(e.target.value)}
                    placeholder="Preferred alias"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple bg-white"
                >
                  <option value="">— Select —</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="rounded border-gray-300 text-accent-purple focus:ring-accent-purple cursor-pointer"
                />
                <span className="text-xs text-gray-600">
                  Opt in to communication
                </span>
              </label>
            </div>

            {/* Role */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Role
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                    placeholder="e.g. Chat Counsellor"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Role Type</label>
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value as RoleType)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple bg-white"
                  >
                    {ROLE_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Cohort */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Cohort
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={cohortYear}
                    onChange={(e) => setCohortYear(e.target.value)}
                    required
                    placeholder={String(currentYear)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Term</label>
                  <select
                    value={cohortTerm}
                    onChange={(e) =>
                      setCohortTerm(e.target.value as CohortTerm)
                    }
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-purple bg-white"
                  >
                    {COHORT_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-accent-purple hover:bg-dark-accent-purple text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Volunteer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
