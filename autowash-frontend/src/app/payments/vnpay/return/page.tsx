import { Suspense } from "react";
import { VnpayReturnPage } from "@/features/bookings/components/vnpay-return-page";

export default function PaymentVnpayReturnRoute() {
  return (
    <Suspense fallback={null}>
      <VnpayReturnPage />
    </Suspense>
  );
}
