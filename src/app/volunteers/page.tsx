import VolunteersTable from "@/components/volunteers/VolunteersTable";

export default function VolunteersPage(): React.JSX.Element {
  return (
    <div className="w-full px-10 pt-8 pb-4">
      <h1 className="text-3xl font-bold mb-6">Volunteer List</h1>
      <VolunteersTable />
    </div>
  );
}
