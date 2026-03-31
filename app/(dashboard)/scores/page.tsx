import { TopBar } from "@/components/layout/TopBar";
import { ScoreUploadScreen } from "@/components/screens/ScoreUploadScreen";

export default function ScoresPage() {
  return (
    <>
      <TopBar title="Score Upload" />
      <ScoreUploadScreen />
    </>
  );
}
