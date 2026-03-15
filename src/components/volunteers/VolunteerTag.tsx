import { getTagColorClass } from "./utils";
import clsx from "clsx";

export const VolunteerTag = ({
  label,
}: {
  label: string | null;
}): React.JSX.Element | null => {
  if (!label) return null;

  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded text-xs font-medium inline-flex items-center",
        getTagColorClass(label),
        "text-gray-800"
      )}
    >
      {label}
    </span>
  );
};
