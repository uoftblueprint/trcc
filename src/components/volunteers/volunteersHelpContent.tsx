import React from "react";

export type HelpVariant = "admin" | "staff" | "viewer";

export function getHelpVariant(role: string | null): HelpVariant {
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  return "viewer";
}

export function getHelpStorageKey(variant: HelpVariant): string {
  return `trcc_volunteers_table_help_dismissed_${variant}`;
}

export function getHelpTitleAndIntro(variant: HelpVariant): {
  title: string;
  intro: string;
} {
  if (variant === "admin") {
    return {
      title: "Using the volunteers table (admin)",
      intro:
        "You can edit data, import, and manage volunteers. Here’s how selection and editing work.",
    };
  }
  if (variant === "staff") {
    return {
      title: "Using the volunteers table (staff)",
      intro:
        "You can browse and copy data. Editing is limited to admins—your view is read-only.",
    };
  }
  return {
    title: "Using the volunteers table",
    intro:
      "Browse and filter volunteer information. Contact an admin if you need changes to the data.",
  };
}

const Kbd = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <kbd className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono">
    {children}
  </kbd>
);

function SharedSelectingCopyingFilters(): React.JSX.Element {
  return (
    <>
      <section>
        <h3 className="font-semibold text-gray-900 mb-1.5">Selecting cells</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Click and drag to select a rectangle of cells (like a spreadsheet).
          </li>
          <li>
            Hold <Kbd>Shift</Kbd> and click another cell to extend the
            selection.
          </li>
          <li>
            Hold <Kbd>⌘</Kbd> (Mac) or <Kbd>Ctrl</Kbd> (Windows) and click to
            add or remove cells from the selection.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-1.5">Copying</h3>
        <p>
          With cells selected, use <strong>Copy cells</strong> in the toolbar to
          choose tab-separated (Excel), CSV, or plain comma-separated text. You
          can also press <Kbd>⌘C</Kbd> or <Kbd>Ctrl+C</Kbd> for tab-separated
          text—handy for pasting into a sheet.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-1.5">
          Filters & privacy
        </h3>
        <p>
          Use <strong>Filter</strong> and <strong>Sort</strong> above the table.
          The default opt-in filter limits who appears until you change it—check
          warnings before removing it. <strong>Match all / any</strong> only
          combines the other column filters; an opt-in filter is always applied
          on top of that.
        </p>
      </section>
    </>
  );
}

export function VolunteersHelpContent({
  variant,
}: {
  variant: HelpVariant;
}): React.JSX.Element {
  return (
    <div className="text-sm text-gray-700 space-y-4 leading-relaxed">
      <SharedSelectingCopyingFilters />

      {variant === "admin" && (
        <>
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">Editing</h3>
            <p>
              A single click only selects a cell. To edit:{" "}
              <strong>double-click</strong> the cell, or select it and press{" "}
              <Kbd>Enter</Kbd> or <Kbd>F2</Kbd>. Use{" "}
              <strong>Save Changes</strong> when you’re done; undo/redo is in
              the toolbar (<Kbd>⌘Z</Kbd> / <Kbd>Ctrl+Z</Kbd>).
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">Admin tools</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>New Volunteer</strong> and{" "}
                <strong>Import from CSV</strong> add rows to the table.
              </li>
              <li>
                Select rows with the checkboxes, then <strong>Delete</strong> to
                remove volunteers (you’ll confirm in a dialog).
              </li>
              <li>
                New tags (roles, cohorts) can be typed in the cell editor; save
                to persist them.
              </li>
            </ul>
          </section>
        </>
      )}

      {(variant === "staff" || variant === "viewer") && (
        <section>
          <h3 className="font-semibold text-gray-900 mb-1.5">View only</h3>
          <p>
            {variant === "staff"
              ? "As staff, you can search, filter, sort, and copy from the table, but you cannot change volunteer data here. Ask an admin to update records."
              : "You can search, filter, sort, and copy from the table. To update volunteer records, ask an admin."}
          </p>
        </section>
      )}
    </div>
  );
}
