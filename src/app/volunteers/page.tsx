import { Suspense } from "react";
import { AlreadyLoggedInNotice } from "@/components/volunteers/AlreadyLoggedInNotice";
import { VolunteersTable } from "@/components/volunteers/VolunteersTable";
import Link from "next/link";
import { Users, BookOpen } from "lucide-react";

export default function VolunteersPage(): React.JSX.Element {
  return (
    <div className="w-full px-10 pt-8 pb-6">
      <Suspense fallback={null}>
        <AlreadyLoggedInNotice />
      </Suspense>
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 m-0">
              Volunteers Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage volunteer records, filters, and updates.
            </p>
          </div>
        </div>

        <Link
          href="/volunteers/instructions"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Instructions
        </Link>
      </div>
      <VolunteersTable />
    </div>
  );
}
