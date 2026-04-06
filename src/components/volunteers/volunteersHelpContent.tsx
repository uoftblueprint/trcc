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
        "You can edit data, use Shortcuts and CSV import, and manage tag names. Here’s how selection, filters, and editing work.",
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
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Use <strong>Filter</strong> and <strong>Sort</strong> above the
            table to narrow and order rows.
          </li>
          <li>
            <strong>Opt-in communication</strong> is its own filter chip. It is{" "}
            <strong>not</strong> part of <strong>Match all</strong> /{" "}
            <strong>Match any</strong>: that control only decides how your{" "}
            <em>other</em> column filters combine (every filter vs any filter).
            Who appears in the table must still satisfy the opt-in filter (when
            it is present), <em>and</em> the combined column filters—unless you
            remove or change opt-in after confirming the warning.
          </li>
          <li>
            Filters you add from <strong>Shortcuts</strong> (missing email,
            missing phone, missing email or phone) show as preset chips in the
            filter bar. You can remove them with the chip’s <strong>×</strong>;
            they do not open the usual filter editor.
          </li>
        </ul>
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
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Shortcuts</strong> opens a panel of helpers: format
                phones in the <em>current table view</em>; copy all emails or
                phones from that view; set a field on checkbox-selected rows;
                find duplicate emails or phones (with links that jump to the
                right page); apply server filters for missing contact info; and
                create several volunteers at once from pasted lines. Anything
                that says “current view” follows search, filters, and
                pagination—only rows on the visible page are included where
                noted.
              </li>
              <li>
                <strong>Import from CSV</strong> opens a larger dialog with
                expandable instructions (Google Sheets export, required column
                titles{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">
                  volunteer
                </code>{" "}
                and{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">email</code>,
                plus optional columns). After a run, read the summary:{" "}
                <strong>red</strong> sections are problems in the file or saves
                that you should fix; <strong>sky / blue</strong> notices mean
                the volunteer was still imported but a spreadsheet value was
                skipped (for example unrecognized cohort or invalid email)—fix
                the cell and use <strong>Import again</strong> to update. The
                same file can be re-imported after edits.
              </li>
              <li>
                <strong>Manage tags</strong> edits the display names of roles
                and cohort terms used in filters, the table, and CSV import—not
                individual volunteers’ assignments.
              </li>
              <li>
                <strong>New Volunteer</strong> adds one row through a form.
              </li>
              <li>
                Select rows with the checkboxes, then use{" "}
                <strong>Delete</strong> on the right side of the toolbar (you’ll
                confirm in a dialog).
              </li>
              <li>
                New tags (roles, cohorts) can be typed in the cell editor; use{" "}
                <strong>Save Changes</strong> on the right when you’re done.
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
              : "You can search, filter, sort, and copy from the table. To update volunteer records, ask an admin."}{" "}
            Admins also see <strong>Shortcuts</strong>,{" "}
            <strong>Import from CSV</strong>, and <strong>Manage tags</strong>{" "}
            in the toolbar.
          </p>
        </section>
      )}
    </div>
  );
}
