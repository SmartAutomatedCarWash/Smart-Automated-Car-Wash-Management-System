import { CustomerDiscountDetailPage } from "@/features/discounts/components/customer-discount-detail-page";

export default function CustomerDiscountDetailRoute({ params }: { params: { id: string } }) {
  return <CustomerDiscountDetailPage userDiscountId={params.id} />;
}
