import { CustomerComboCheckoutPage } from "@/features/combos/components/customer-combo-checkout-page";

export default function ComboCheckoutPage({
  params,
  searchParams,
}: {
  params: { comboId: string };
  searchParams?: { comboIds?: string };
}) {
  const comboIds = searchParams?.comboIds
    ? searchParams.comboIds.split(",").map((id) => id.trim()).filter(Boolean)
    : [params.comboId];

  return <CustomerComboCheckoutPage comboIds={comboIds} />;
}
