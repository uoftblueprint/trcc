import { Suspense } from "react";
import { AlreadyLoggedInNotice } from "@/components/volunteers/AlreadyLoggedInNotice";
import { VolunteersTable } from "@/components/volunteers/VolunteersTable";

export default function VolunteersPage(): React.JSX.Element {
  return (
    <div className="w-full px-10 pt-8 pb-4">
      <Suspense fallback={null}>
        <AlreadyLoggedInNotice />
      </Suspense>
      <VolunteersTable />
    </div>
  );
}
