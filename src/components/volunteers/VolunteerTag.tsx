import { X } from "lucide-react";
import { getTagBackgroundColor } from "./utils";
import clsx from "clsx";

export const VolunteerTag = ({
  label,
  onRemove,
}: {
  label: string | null;
  onRemove?: () => void;
}): React.JSX.Element | null => {
  if (!label) return null;

  return (
    <span
      style={{ backgroundColor: getTagBackgroundColor(label) }}
      className={clsx(
        "px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1",
        "text-gray-800"
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          title={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
