import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
} from "react";
import { CellContext } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Volunteer } from "./types";
import { VolunteerTag } from "./VolunteerTag";
import { ArrowRight, Tag } from "lucide-react";
import { NotesDisplay } from "./NotesDisplay";

const SCREEN_EDGE_PADDING_PX = 16;
const POPOVER_VERTICAL_OFFSET_PX = 4;

interface EditableCellProps {
  info: CellContext<Volunteer, unknown>;
  onEdit: (rowId: number, colId: string, value: unknown) => void;
  options?: string[];
  isMulti?: boolean;
  type?: "text" | "options" | "number" | "boolean";
  /** When true (e.g. custom tag column with no preset list), new tags can be typed like roles/cohorts. */
  allowAddTags?: boolean;
}

export const EditableCell = ({
  info,
  onEdit,
  options = [],
  isMulti = false,
  type = "text",
  allowAddTags = false,
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
  const inlineEditorRef = useRef<HTMLDivElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const draftTextRef = useRef("");

  const allowAdd: boolean =
    allowAddTags ||
    ["cohorts", "prior_roles", "current_roles", "future_interests"].includes(
      info.column.id
    );

  /** Forces a fresh DOM subtree when toggling edit mode; avoids ghost nodes from contentEditable + imperative textContent. */
  const modeKey = isEditing ? "edit" : "view";

  useEffect(() => {
    if (isEditing && (type === "text" || type === "number")) return;
    setValue(initialValue);
  }, [initialValue, isEditing, type]);

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
    if (type === "text") {
      const text = String(value ?? "");
      draftTextRef.current = text;
    }
    if (type === "number") {
      setInputValue(
        value === null || value === undefined || value === ""
          ? ""
          : String(value)
      );
    }
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
    if (!isEditing) return;
    if (type !== "options" && type !== "number" && type !== "boolean") return;

    const handleOutsideInteraction = (e: Event): void => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (cellRef.current?.contains(target)) return;
      if (type === "boolean") {
        setIsEditing(false);
        return;
      }
      handleSave();
    };

    document.addEventListener("mousedown", handleOutsideInteraction, true);
    window.addEventListener("scroll", handleOutsideInteraction, true);

    return (): void => {
      document.removeEventListener("mousedown", handleOutsideInteraction, true);
      window.removeEventListener("scroll", handleOutsideInteraction, true);
    };
  }, [isEditing, type, handleSave]);

  useEffect(() => {
    if (!isEditing || type !== "text") return;
    const editor = inlineEditorRef.current;
    if (!editor) return;
    editor.textContent = draftTextRef.current;
    editor.focus();

    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditing, type]);

  const handleDelete = useCallback((): void => {
    let cleared: unknown;
    if (isMulti) cleared = [];
    else if (type === "options") cleared = null;
    else if (type === "boolean") cleared = null;
    else if (type === "number") cleared = null;
    else cleared = "";
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
      const currentArray = Array.isArray(value) ? (value as string[]) : [];
      const alreadyExists =
        options.some((o) => o.toLowerCase() === newTag.toLowerCase()) ||
        currentArray.some((o) => o.toLowerCase() === newTag.toLowerCase());
      applyValue(newTag);
      if (!alreadyExists) {
        const toastId = `new-tag-${info.column.id}-${newTag.toLowerCase()}`;
        toast(`New tag "${newTag}" created — remember to save your changes.`, {
          id: toastId,
          icon: <Tag className="h-5 w-5 shrink-0 text-gray-700" aria-hidden />,
          duration: 4000,
        });
      }
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
        key={modeKey}
        ref={cellRef}
        className="relative w-full h-full flex items-center min-h-6 gap-1 flex-wrap overflow-hidden"
      >
        {currentArray.map((v, i) => (
          <VolunteerTag
            key={i}
            label={v}
            onRemove={() => {
              const updated = currentArray.filter((_, idx) => idx !== i);
              if (isMulti) {
                setValue(updated);
                onEdit(info.row.original.id, info.column.id, updated);
              } else {
                const next: string | null =
                  updated.length === 0 ? null : String(updated[0] ?? "");
                setValue(next);
                onEdit(info.row.original.id, info.column.id, next);
              }
            }}
          />
        ))}

        <div
          ref={popoverRef}
          data-volunteers-overlay
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

  if (isEditing && type === "number") {
    const commitNumber = (): void => {
      const raw = inputValue.trim();
      if (raw === "") {
        setValue(null);
        handleSave(null);
        return;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        toast.error("Enter a valid number");
        return;
      }
      setValue(n);
      handleSave(n);
    };

    return (
      <div
        key={modeKey}
        ref={cellRef}
        className="relative w-full h-full flex items-center min-h-6"
      >
        <div
          ref={popoverRef}
          data-volunteers-overlay
          style={{
            position: "fixed",
            top: `${modalCoords.top}px`,
            left: `${modalCoords.left}px`,
            width: `${modalCoords.width}px`,
            zIndex: 99999,
          }}
          className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex flex-col gap-2"
        >
          <input
            ref={numberInputRef}
            type="number"
            autoFocus
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-purple-300"
            value={inputValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              setInputValue(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitNumber();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setValue(initialValue);
                setIsEditing(false);
              }
            }}
          />
          <button
            type="button"
            onClick={commitNumber}
            className="text-sm font-medium text-purple-700 hover:text-purple-900 py-1"
          >
            Apply
          </button>
        </div>
      </div>
    );
  }

  if (isEditing && type === "boolean") {
    const setBool = (next: boolean | null): void => {
      setValue(next);
      onEdit(info.row.original.id, info.column.id, next);
      setIsEditing(false);
    };

    return (
      <div
        key={modeKey}
        ref={cellRef}
        className="relative w-full h-full flex items-center min-h-6"
      >
        <div
          ref={popoverRef}
          data-volunteers-overlay
          style={{
            position: "fixed",
            top: `${modalCoords.top}px`,
            left: `${modalCoords.left}px`,
            width: `${modalCoords.width}px`,
            zIndex: 99999,
          }}
          className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex flex-col gap-2"
        >
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name={`bool-${info.column.id}-${info.row.id}`}
              checked={value === true}
              onChange={() => setBool(true)}
              className="rounded border-gray-300 text-purple-600"
            />
            Yes
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name={`bool-${info.column.id}-${info.row.id}`}
              checked={value === false}
              onChange={() => setBool(false)}
              className="rounded border-gray-300 text-purple-600"
            />
            No
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input
              type="radio"
              name={`bool-${info.column.id}-${info.row.id}`}
              checked={value !== true && value !== false}
              onChange={() => setBool(null)}
              className="rounded border-gray-300 text-purple-600"
            />
            (empty)
          </label>
        </div>
      </div>
    );
  }

  if (isEditing && type === "text") {
    const commitAndExit = (): void => {
      const text = (inlineEditorRef.current?.textContent ?? "").replace(
        /\r/g,
        ""
      );
      draftTextRef.current = text;
      setValue(text);
      handleSave(text);
    };

    const cancelAndExit = (): void => {
      setValue(initialValue);
      setIsEditing(false);
    };

    if (isNotes) {
      return (
        <div
          key={modeKey}
          ref={inlineEditorRef}
          contentEditable
          suppressContentEditableWarning
          className="w-full min-h-24 px-2 py-1.5 text-sm whitespace-pre-wrap break-words outline-none"
          onInput={(e: React.FormEvent<HTMLDivElement>): void => {
            const next = (e.currentTarget.textContent ?? "").replace(/\r/g, "");
            draftTextRef.current = next;
          }}
          onBlur={commitAndExit}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelAndExit();
            }
          }}
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>): void =>
            e.stopPropagation()
          }
        />
      );
    }

    return (
      <div
        key={modeKey}
        ref={inlineEditorRef}
        contentEditable
        suppressContentEditableWarning
        className="w-full px-1 py-0.5 text-sm outline-none whitespace-pre-wrap break-words"
        onInput={(e: React.FormEvent<HTMLDivElement>): void => {
          const next = (e.currentTarget.textContent ?? "").replace(/\r/g, "");
          draftTextRef.current = next;
        }}
        onBlur={commitAndExit}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitAndExit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelAndExit();
          }
        }}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>): void =>
          e.stopPropagation()
        }
      />
    );
  }

  const renderReadOnlyTags = (): React.ReactNode => {
    if (type === "boolean") {
      if (value === true) return <VolunteerTag label="Yes" />;
      if (value === false) return <VolunteerTag label="No" />;
      return "";
    }
    if (type === "number") {
      if (value === null || value === undefined || value === "") return "";
      return <span className="tabular-nums">{String(value)}</span>;
    }
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
    <Fragment key={modeKey}>
      <div
        className="absolute inset-0 z-0 cursor-cell select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
        onDoubleClick={(e: React.MouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode(e);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === "F2") {
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
            ? "Double-click or press Enter to edit. Use Show more to read long notes."
            : "Click to select, double-click or press Enter to edit"
        }
      />
      <div className="relative z-10 w-full h-full min-h-6 cursor-text flex items-center gap-1 flex-wrap overflow-hidden pointer-events-none">
        {renderReadOnlyTags()}
      </div>
    </Fragment>
  );
};
