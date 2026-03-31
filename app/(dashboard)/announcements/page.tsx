import { TopBar } from "@/components/layout/TopBar";
import { AnnouncementsScreen } from "@/components/screens/AnnouncementsScreen";

export default function AnnouncementsPage() {
  return (
    <>
      <TopBar title="Announcements" />
      <AnnouncementsScreen />
    </>
  );
}
