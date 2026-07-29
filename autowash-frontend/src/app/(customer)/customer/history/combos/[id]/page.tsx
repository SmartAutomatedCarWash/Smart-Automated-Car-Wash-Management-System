import { CustomerComboHistoryDetailPage } from "@/features/loyalty/components/customer-combo-history-detail-page";

export default function CustomerComboHistoryDetailRoute({ params }: { params: { id: string } }) {
  return <CustomerComboHistoryDetailPage customerComboId={params.id} />;
}
