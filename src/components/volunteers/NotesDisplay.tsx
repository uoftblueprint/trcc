import React, { useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const NotesDisplay = ({
  value,
  expanded: controlledExpanded,
  onToggle,
}: {
  value: unknown;
  expanded?: boolean;
  onToggle?: () => void;
}): React.JSX.Element => {
  const text = String(value ?? "");
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;
  const toggle = onToggle ?? ((): void => setInternalExpanded((prev) => !prev));
  const [isClamped, setIsClamped] = React.useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const wasExpanded = !el.classList.contains("line-clamp-2");
    if (wasExpanded) el.classList.add("line-clamp-2");
    const clamped = el.scrollHeight > el.clientHeight + 1;
    if (wasExpanded) el.classList.remove("line-clamp-2");
    setIsClamped(clamped);
  }, [text]);

  if (!text) return <></>;

  return (
    <div className="flex flex-col gap-1 w-full">
      <div
        ref={textRef}
        className={expanded ? "whitespace-pre-wrap" : "line-clamp-2"}
      >
        {text}
      </div>
      {isClamped && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="pointer-events-auto self-start text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-0.5 cursor-pointer"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
