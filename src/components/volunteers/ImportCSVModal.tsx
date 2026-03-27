"use client";

import React, { useRef, useState } from "react";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { importCsvAction } from "@/lib/api/actions";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportResult = Awaited<ReturnType<typeof importCsvAction>>;

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
      setFileError("Please select a .csv file.");
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
      setResult(importResult);
      if (importResult.summary.dbSucceeded > 0) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allErrors = result ? [...result.parseErrors, ...result.dbErrors] : [];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/25 z-40"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Import from CSV
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* File picker */}
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-secondary-purple transition-colors"
              onClick={() => fileInputRef.current?.click()}
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
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {fileError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {fileError}
              </p>
            )}

            {/* Result summary */}
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
                        ? "Partial import — some rows failed"
                        : "Import failed"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>Total rows</span>
                  <span className="font-medium text-gray-900">
                    {result.summary.totalRows}
                  </span>
                  <span>Imported</span>
                  <span className="font-medium text-gray-900">
                    {result.summary.dbSucceeded}
                  </span>
                  <span>Parse errors</span>
                  <span className="font-medium text-gray-900">
                    {result.summary.parseFailed}
                  </span>
                  <span>DB errors</span>
                  <span className="font-medium text-gray-900">
                    {result.summary.dbFailed}
                  </span>
                </div>

                {allErrors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                    {allErrors.map((err, i) => (
                      <div
                        key={i}
                        className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1"
                      >
                        {"column" in err && err.column
                          ? `Row ${err.rowIndex + 1}, ${err.column}: ${err.message}`
                          : `Row ${err.rowIndex + 1}: ${err.message}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!fileName || submitting}
                  className="px-4 py-2 bg-accent-purple hover:bg-dark-accent-purple text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Importing..." : "Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
