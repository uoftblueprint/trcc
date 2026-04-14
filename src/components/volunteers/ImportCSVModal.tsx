"use client";

import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import {
  isForbiddenOperationMessage,
  notifyIfForbiddenError,
  toastForbiddenOperation,
} from "@/lib/client/forbiddenOperationToast";
import { importCsvAction } from "@/lib/api/actions";
import {
  CSV_IMPORT_GOOGLE_SHEETS_STEPS,
  CSV_IMPORT_OPTIONAL_COLUMNS,
  CSV_IMPORT_REQUIRED_COLUMNS,
  CSV_IMPORT_TROUBLESHOOTING,
  formatCsvImportErrorForDisplay,
  formatCsvImportWarningForDisplay,
} from "@/lib/volunteers/csvImportUserHelp";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportResult = Awaited<ReturnType<typeof importCsvAction>>;

function truncateValue(value: string, max = 72): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function resultHeadline(result: ImportResult): string {
  const s = result.summary;
  if (result.status === "success") {
    const saved = s.dbInserted + s.dbUpdated;
    if (saved === 0 && s.totalRows === 0) {
      return "No rows were in the file.";
    }
    if (saved === 0 && s.dbDuplicates > 0) {
      return "All rows matched existing volunteers; nothing needed updating.";
    }
    const parts: string[] = [];
    if (s.dbInserted > 0)
      parts.push(
        `${s.dbInserted} new volunteer${s.dbInserted === 1 ? "" : "s"} added`
      );
    if (s.dbUpdated > 0) parts.push(`${s.dbUpdated} updated`);
    if (s.dbDuplicates > 0)
      parts.push(`${s.dbDuplicates} unchanged (already up to date)`);
    return parts.length > 0 ? `${parts.join(" · ")}.` : "Import finished.";
  }
  if (result.status === "partial_success") {
    const failed = s.parseFailed + s.dbFailed;
    return `${s.dbSucceeded} row${s.dbSucceeded === 1 ? "" : "s"} saved. ${failed} row${failed === 1 ? "" : "s"} still need fixes — correct your spreadsheet and import again.`;
  }
  return "Nothing was imported. Fix the problems listed below, then try again.";
}

export const ImportCSVModal = ({
  isOpen,
  onClose,
  onSuccess,
}: ImportCSVModalProps): React.JSX.Element | null => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const resetState = (): void => {
    setFileName(null);
    setResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (): void => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    setResult(null);
    setFileError(null);
    if (!file) {
      setFileName(null);
      return;
    }
    if (!file.name.endsWith(".csv")) {
      setFileError("Please choose a file that ends in .csv (not Excel .xlsx).");
      setFileName(null);
      return;
    }
    setFileName(file.name);
  };

  const handleImport = async (): Promise<void> => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setResult(null);
    try {
      const text = await file.text();
      const importResult = await importCsvAction(text);
      if (
        importResult.parseErrors.some((e) =>
          isForbiddenOperationMessage(e.message)
        )
      ) {
        toastForbiddenOperation();
      }
      setResult(importResult);
      if (importResult.summary.dbSucceeded > 0) {
        onSuccess();
      }
    } catch (e) {
      if (!notifyIfForbiddenError(e)) {
        toast.error("Import failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const parseErrors = result?.parseErrors ?? [];
  const parseWarnings = result?.parseWarnings ?? [];
  const dbErrors = result?.dbErrors ?? [];

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
          aria-labelledby="import-csv-modal-title"
          className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-xl pointer-events-auto max-h-[min(92vh,40rem)] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
            <h2
              id="import-csv-modal-title"
              className="text-sm font-semibold text-gray-900"
            >
              Import from CSV
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 overflow-y-auto min-h-0">
            <details className="group rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 open:bg-gray-50/90">
              <summary className="cursor-pointer list-none px-3 py-2.5 font-medium text-gray-900 flex items-center gap-2 [&::-webkit-details-marker]:hidden">
                <span className="text-secondary-purple group-open:rotate-90 transition-transform inline-block">
                  ›
                </span>
                How to use this import (Google Sheets & columns)
              </summary>
              <div className="px-3 pb-3 pt-0 space-y-4 border-t border-gray-200/80">
                <div>
                  <p className="font-medium text-gray-900 mt-2 mb-1">Steps</p>
                  <ol className="list-decimal pl-4 space-y-1.5">
                    {CSV_IMPORT_GOOGLE_SHEETS_STEPS.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">
                    Required column titles (row 1)
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Spelling can be uppercase or lowercase. These two column
                    titles must appear in the first row:
                  </p>
                  <ul className="list-disc pl-4 space-y-2">
                    {CSV_IMPORT_REQUIRED_COLUMNS.map((col) => (
                      <li key={col.header}>
                        <span className="font-mono text-xs bg-white px-1 rounded border border-gray-200">
                          {col.header}
                        </span>
                        <span className="text-gray-600">
                          {" "}
                          — {col.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">
                    Optional columns
                  </p>
                  <ul className="list-disc pl-4 space-y-2 text-gray-600">
                    {CSV_IMPORT_OPTIONAL_COLUMNS.map((col) => (
                      <li key={col.label}>
                        <span className="font-mono text-xs bg-white px-1 rounded border border-gray-200 text-gray-800">
                          {col.header}
                        </span>
                        {"note" in col ? <span> — {col.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-gray-500">
                  Tip: Remove completely empty rows at the bottom of your sheet
                  before downloading — they can cause “missing name” errors.
                </p>
              </div>
            </details>

            <details className="group rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 open:bg-gray-50/90">
              <summary className="cursor-pointer list-none px-3 py-2.5 font-medium text-gray-900 flex items-center gap-2 [&::-webkit-details-marker]:hidden">
                <span className="text-secondary-purple group-open:rotate-90 transition-transform inline-block">
                  ›
                </span>
                Common errors and how to fix them
              </summary>
              <div className="px-3 pb-3 pt-0 space-y-4 border-t border-gray-200/80">
                <p className="text-xs text-gray-600 mt-2">
                  If your import shows red errors or yellow notices, find the
                  issue below and update your spreadsheet, then use{" "}
                  <span className="font-medium text-gray-800">
                    Import again
                  </span>
                  .
                </p>
                <ul className="space-y-3 list-none pl-0">
                  {CSV_IMPORT_TROUBLESHOOTING.map((item) => (
                    <li
                      key={item.problem}
                      className="rounded-md border border-gray-200/90 bg-white/80 px-3 py-2"
                    >
                      <p className="font-medium text-gray-900 text-xs mb-1.5">
                        {item.problem}
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
                        {item.fixes.map((fix, fixIdx) => (
                          <li key={`${item.problem}-${fixIdx}`}>{fix}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            </details>

            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-secondary-purple transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Upload className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600">
                {fileName ?? "Click to select a CSV file"}
              </p>
              {fileName && (
                <p className="text-xs text-gray-400">Click to change file</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {fileError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {fileError}
              </p>
            )}

            {result && (
              <div className="flex flex-col gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                    result.status === "success"
                      ? "bg-tag-green text-gray-800"
                      : result.status === "partial_success"
                        ? "bg-tag-yellow text-gray-800"
                        : "bg-tag-red text-gray-800"
                  }`}
                >
                  {result.status === "success" ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {result.status === "success"
                      ? "Import successful"
                      : result.status === "partial_success"
                        ? "Partial import"
                        : "Import did not complete"}
                  </span>
                </div>

                <p className="text-sm text-gray-700">
                  {resultHeadline(result)}
                </p>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-600">
                  <span>Rows in file</span>
                  <span className="font-medium text-gray-900">
                    {result.summary.totalRows}
                  </span>
                  <span>New volunteers</span>
                  <span className="font-medium text-green-700">
                    {result.summary.dbInserted}
                  </span>
                  <span>Updated</span>
                  <span className="font-medium text-blue-700">
                    {result.summary.dbUpdated}
                  </span>
                  <span>Unchanged (duplicate)</span>
                  <span className="font-medium text-gray-500">
                    {result.summary.dbDuplicates}
                  </span>
                  <span>Rows with read errors</span>
                  <span className="font-medium text-gray-900">
                    {result.summary.parseFailed}
                  </span>
                  <span>Rows that failed to save</span>
                  <span className="font-medium text-gray-900">
                    {result.summary.dbFailed}
                  </span>
                  <span>
                    Spreadsheet values skipped (volunteers still saved)
                  </span>
                  <span className="font-medium text-sky-800">
                    {parseWarnings.length}
                  </span>
                </div>

                {parseWarnings.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-sky-900 uppercase tracking-wide">
                      Skipped spreadsheet values — volunteers were still
                      imported
                    </p>
                    <div className="max-h-40 overflow-y-auto flex flex-col gap-2 pr-1">
                      {parseWarnings.map((w, i) => {
                        const d = formatCsvImportWarningForDisplay(w);
                        return (
                          <div
                            key={`w-${i}-${w.rowIndex}-${w.message}`}
                            className="rounded-md border border-sky-200 bg-sky-50/90 px-3 py-2 text-xs space-y-1.5"
                          >
                            <p className="font-semibold text-sky-950">
                              {d.location}
                            </p>
                            <p className="text-sky-950">{d.summary}</p>
                            {d.rawValue !== undefined ? (
                              <p className="text-sky-900/90 font-mono break-all">
                                Value: {truncateValue(d.rawValue)}
                              </p>
                            ) : null}
                            {d.hint ? (
                              <p className="text-sky-900/90 border-t border-sky-100 pt-2">
                                {d.hint}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {parseErrors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                      Problems in the CSV file
                    </p>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
                      {parseErrors.map((err, i) => {
                        const d = formatCsvImportErrorForDisplay(err, "parse");
                        return (
                          <div
                            key={`p-${i}-${err.rowIndex}-${err.message}`}
                            className="rounded-md border border-red-100 bg-red-50/90 px-3 py-2 text-xs space-y-1.5"
                          >
                            <p className="font-semibold text-red-950">
                              {d.location}
                            </p>
                            <p className="text-red-900">{d.summary}</p>
                            {d.rawValue !== undefined ? (
                              <p className="text-red-800/90 font-mono break-all">
                                Value: {truncateValue(d.rawValue)}
                              </p>
                            ) : null}
                            {d.hint ? (
                              <p className="text-red-900/90 border-t border-red-100 pt-2">
                                {d.hint}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {dbErrors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                      Could not save to the database
                    </p>
                    <div className="max-h-36 overflow-y-auto flex flex-col gap-2 pr-1">
                      {dbErrors.map((err, i) => {
                        const d = formatCsvImportErrorForDisplay(err, "db");
                        return (
                          <div
                            key={`d-${i}-${err.rowIndex}`}
                            className="rounded-md border border-amber-100 bg-amber-50/90 px-3 py-2 text-xs space-y-1.5"
                          >
                            <p className="font-semibold text-amber-950">
                              {d.location}
                            </p>
                            <p className="text-amber-950">{d.summary}</p>
                            {d.hint ? (
                              <p className="text-amber-900/90 border-t border-amber-100 pt-2">
                                {d.hint}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {result ? "Close" : "Cancel"}
            </button>
            {fileName ? (
              <button
                type="button"
                onClick={handleImport}
                disabled={submitting}
                className="px-4 py-2 bg-accent-purple hover:bg-dark-accent-purple text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting
                  ? "Importing..."
                  : result
                    ? "Import again"
                    : "Import"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
