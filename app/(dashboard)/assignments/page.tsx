import { TopBar } from "@/components/layout/TopBar";
import { AssignmentsScreen } from "@/components/screens/AssignmentsScreen";

export default function AssignmentsPage() {
  return (
    <>
      <TopBar title="Assignments" />
      <AssignmentsScreen />
    </>
  );
}
