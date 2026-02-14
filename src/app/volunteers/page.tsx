import VolunteersTable from "@/components/volunteers/VolunteersTable";

export default function VolunteersPage(): React.JSX.Element {
  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Volunteer Tracking</h1>
      <VolunteersTable />
    </div>
  );
}
