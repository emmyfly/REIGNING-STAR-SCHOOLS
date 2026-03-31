import { TopBar } from "@/components/layout/TopBar";
import { PaymentReviewScreen } from "@/components/screens/PaymentReviewScreen";

export default function PaymentsPage() {
  return (
    <>
      <TopBar title="Payments" />
      <PaymentReviewScreen />
    </>
  );
}
