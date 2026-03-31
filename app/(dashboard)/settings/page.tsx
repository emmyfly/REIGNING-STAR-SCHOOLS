import { TopBar } from "@/components/layout/TopBar";
import { SettingsScreen } from "@/components/screens/SettingsScreen";

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />
      <SettingsScreen />
    </>
  );
}
