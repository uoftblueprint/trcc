import { BookOpen } from "lucide-react";
import { getCurrentUserServer } from "@/lib/api/getCurrentUserServer";
import {
  getHelpVariant,
  getHelpTitleAndIntro,
  VolunteersHelpContent,
} from "@/components/volunteers/volunteersHelpContent";
import { VolunteersInstructionsControls } from "@/components/volunteers/VolunteersInstructionsControls";

export default async function VolunteersInstructionsPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUserServer();
  const variant = getHelpVariant(user?.role ?? null);
  const { title, intro } = getHelpTitleAndIntro(variant);

  return (
    <div className="w-full px-10 pt-8 pb-6">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 p-6 border-b border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 shrink-0">
            <BookOpen className="w-5 h-5 text-purple-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600 mt-1">{intro}</p>
          </div>
        </div>

        <div className="p-6">
          <VolunteersHelpContent variant={variant} />

          <div className="mt-6 space-y-4">
            <section className="p-4 border border-gray-200 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Recommended workflow
              </h2>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                <li>Apply filters first, then add sorting for review order.</li>
                <li>
                  Remember <strong>Match all / any</strong> only groups your
                  extra column filters; <strong>opt-in communication</strong> is
                  always layered on separately until you change it.
                </li>
                <li>
                  For bulk checks, use drag selection and copy to a spreadsheet,
                  or (admins) open <strong>Shortcuts</strong> for copy-all,
                  duplicate scan, or missing-contact filters.
                </li>
                <li>
                  CSV import: use the in-dialog help for column names and export
                  steps; treat red messages as must-fix, sky/blue notices as
                  “saved but fix the cell and Import again.”
                </li>
                <li>
                  If you edit values, use Undo/Redo and the unsaved changes
                  viewer before saving.
                </li>
              </ul>
            </section>

            <section className="p-4 border border-gray-200 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Data handling reminders
              </h2>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                <li>
                  Respect opt-in status when filtering or copying contacts.
                  Shortcut actions that use the “current view” follow the same
                  filtered list as the table.
                </li>
                <li>
                  Avoid exporting or sharing personal information unless needed.
                </li>
                <li>
                  Double-check notes and role/cohort tags before confirming
                  save. Use <strong>Manage tags</strong> when you need to rename
                  a role or cohort label everywhere it appears.
                </li>
              </ul>
            </section>

            <VolunteersInstructionsControls variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}
