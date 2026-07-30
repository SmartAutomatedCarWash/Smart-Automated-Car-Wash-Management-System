import { CustomerSupportPageContent } from "@/features/support/components/customer-support-page";
import { CarwashStoreProvider } from "@/shared/store/carwash-store";

export default function CustomerSupportPage() {
  return (
    <CarwashStoreProvider>
      <CustomerSupportPageContent />
    </CarwashStoreProvider>
  );
}
