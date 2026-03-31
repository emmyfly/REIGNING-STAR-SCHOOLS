import { TopBar } from "@/components/layout/TopBar";
import { DashboardScreen } from "@/components/screens/DashboardScreen";

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <DashboardScreen />
    </>
  );
}
