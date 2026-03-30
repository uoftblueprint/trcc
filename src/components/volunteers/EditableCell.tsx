import React, { useState, useEffect, useRef, useCallback } from "react";
import { CellContext } from "@tanstack/react-table";
import { Volunteer } from "./types";
import { VolunteerTag } from "./VolunteerTag";
import { ArrowRight } from "lucide-react";
import { NotesDisplay } from "./NotesDisplay";

const SCREEN_EDGE_PADDING_PX = 16;
const POPOVER_VERTICAL_OFFSET_PX = 4;

interface EditableCellProps {
  info: CellContext<Volunteer, unknown>;
  onEdit: (rowId: number, colId: string, value: unknown) => void;
  options?: string[];
  isMulti?: boolean;
  type?: "text" | "options";
}

export const EditableCell = ({
  info,
  onEdit,
  options = [],
  isMulti = false,
  type = "text",
}: EditableCellProps): React.JSX.Element => {
  const initialValue = info.getValue();
  const isNotes = info.column.id === "notes";
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState<boolean>(false);
  const [value, setValue] = useState<unknown>(initialValue);
  const [inputValue, setInputValue] = useState<string>("");

  const [modalCoords, setModalCoords] = useState<{
    top: number;
    left: number;
    width: number;
  }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const allowAdd: boolean = [
    "cohorts",
    "prior_roles",
    "current_roles",
    "future_interests",
  ].includes(info.column.id);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const enterEditMode = (e: React.SyntheticEvent<HTMLDivElement>): void => {
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    const td = target.closest("td");
    const rect = (td || target).getBoundingClientRect();
    const cellWidth = rect.width;
    let leftPos = rect.left;
    if (leftPos + cellWidth > window.innerWidth) {
      leftPos = window.innerWidth - cellWidth - SCREEN_EDGE_PADDING_PX;
    }

    setModalCoords({
      top: rect.bottom + POPOVER_VERTICAL_OFFSET_PX,
      left: leftPos,
      width: cellWidth,
    });

    setInputValue("");
    setIsEditing(true);
  };

  const handleSave = useCallback(
    (forcedValue?: unknown): void => {
      setIsEditing(false);

      const valueToCheck = forcedValue !== undefined ? forcedValue : value;
      const isArray =
        Array.isArray(initialValue) || Array.isArray(valueToCheck);
      let isChanged = false;

      if (isArray) {
        const arr1 = Array.isArray(initialValue)
          ? (initialValue as unknown[])
          : [];
        const arr2 = Array.isArray(valueToCheck)
          ? (valueToCheck as unknown[])
          : [];
        isChanged =
          JSON.stringify([...arr1].sort()) !== JSON.stringify([...arr2].sort());
      } else {
        const val1 =
          initialValue === null || initialValue === undefined
            ? ""
            : String(initialValue);
        const val2 =
          valueToCheck === null || valueToCheck === undefined
            ? ""
            : String(valueToCheck);
        isChanged = val1 !== val2;
      }

      if (isChanged) {
        onEdit(info.row.original.id, info.column.id, valueToCheck);
      }
    },
    [initialValue, value, info.row.original.id, info.column.id, onEdit]
  );

  useEffect(() => {
    if (!isEditing || type === "text") return;

    const handleOutsideInteraction = (e: Event): void => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (cellRef.current?.contains(target)) return;
      handleSave();
    };

    document.addEventListener("mousedown", handleOutsideInteraction, true);
    window.addEventListener("scroll", handleOutsideInteraction, true);

    return (): void => {
      document.removeEventListener("mousedown", handleOutsideInteraction, true);
      window.removeEventListener("scroll", handleOutsideInteraction, true);
    };
  }, [isEditing, type, handleSave]);

  const handleDelete = useCallback((): void => {
    const cleared = isMulti ? [] : type === "options" ? null : "";
    setValue(cleared);
    onEdit(info.row.original.id, info.column.id, cleared);
  }, [isMulti, type, info.row.original.id, info.column.id, onEdit]);

  const applyValue = (val: string): void => {
    if (isMulti) {
      if (!Array.isArray(value)) {
        setValue([val]);
      } else if (!(value as string[]).includes(val)) {
        setValue([...(value as string[]), val]);
      }
    } else {
      setValue(val);
      handleSave(val);
    }
  };

  const handleAddTempOption = (): void => {
    if (!inputValue.trim()) return;
    const newTag = inputValue.trim();

    if (!allowAdd) {
      const existingMatch = options.find(
        (o) => o.toLowerCase() === newTag.toLowerCase()
      );
      if (!existingMatch) return;
      applyValue(existingMatch);
    } else {
      applyValue(newTag);
    }
    setInputValue("");
  };

  if (isEditing && type === "options") {
    const currentArray: string[] = Array.isArray(value)
      ? (value as string[])
      : value
        ? [String(value)]
        : [];

    return (
      <div
        ref={cellRef}
        className="relative w-full h-full flex items-center min-h-6 gap-1 flex-wrap overflow-hidden"
      >
        {currentArray.map((v, i) => (
          <VolunteerTag
            key={i}
            label={v}
            onRemove={() => {
              const updated = currentArray.filter((_, idx) => idx !== i);
              setValue(updated);
              onEdit(info.row.original.id, info.column.id, updated);
            }}
          />
        ))}

        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${modalCoords.top}px`,
            left: `${modalCoords.left}px`,
            width: `${modalCoords.width}px`,
            zIndex: 99999,
          }}
          className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2 focus-within:ring-2 focus-within:ring-purple-300">
            <input
              autoFocus
              className="w-full py-1.5 text-sm outline-none bg-transparent"
              placeholder={
                allowAdd
                  ? isMulti
                    ? "Search or create..."
                    : "Select or create..."
                  : "Search..."
              }
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setInputValue(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
                if (e.key === "Enter") handleAddTempOption();
              }}
            />
            {allowAdd && (
              <button
                onClick={handleAddTempOption}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-purple-600 transition-colors cursor-pointer"
                title="Create new"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {[...new Set([...options, ...currentArray])]
              .filter((opt) =>
                opt.toLowerCase().includes(inputValue.toLowerCase())
              )
              .map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-gray-50 rounded"
                >
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    checked={currentArray.includes(opt)}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ): void => {
                      if (isMulti) {
                        const updated = e.target.checked
                          ? [...currentArray, opt]
                          : currentArray.filter((o) => o !== opt);
                        setValue(updated);
                        onEdit(info.row.original.id, info.column.id, updated);
                      } else {
                        applyValue(opt);
                      }
                    }}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-600 cursor-pointer"
                  />
                  <VolunteerTag label={opt} />
                </label>
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (isEditing && type === "text") {
    return (
      <input
        autoFocus
        className="w-full bg-white border border-blue-400 px-1 py-0.5 text-sm rounded outline-none"
        value={(value as string) || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          setValue(e.target.value)
        }
        onBlur={(): void => handleSave()}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setValue(initialValue);
            setIsEditing(false);
          }
        }}
        onMouseDown={(e: React.MouseEvent<HTMLInputElement>): void =>
          e.stopPropagation()
        }
      />
    );
  }

  const renderReadOnlyTags = (): React.ReactNode => {
    if (type === "options") {
      if (Array.isArray(value)) {
        return (value as string[]).map((v, i) => (
          <VolunteerTag key={i} label={v} />
        ));
      } else if (value) {
        return <VolunteerTag label={String(value)} />;
      }
      return "";
    }
    if (isNotes) {
      return (
        <NotesDisplay
          value={value}
          expanded={isNotesExpanded}
          onToggle={() => setIsNotesExpanded((prev) => !prev)}
        />
      );
    }
    return String(value ?? "");
  };

  return (
    <>
      <div
        className="absolute inset-0 z-0 cursor-text focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            if (isNotes) {
              e.preventDefault();
              setIsNotesExpanded((prev) => !prev);
            } else {
              enterEditMode(e);
            }
          }
        }}
        onDoubleClick={(e: React.MouseEvent<HTMLDivElement>) => {
          if (isNotes) {
            enterEditMode(e);
          }
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            enterEditMode(e);
          }
          if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            handleDelete();
          }
        }}
        tabIndex={0}
        title={
          isNotes
            ? "Click to expand, double-click to edit"
            : "Click or press Enter to edit"
        }
      />
      <div className="relative z-10 w-full h-full min-h-6 cursor-text flex items-center gap-1 flex-wrap overflow-hidden pointer-events-none">
        {renderReadOnlyTags()}
      </div>
    </>
  );
};
