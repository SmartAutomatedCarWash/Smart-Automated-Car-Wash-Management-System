import { StaffSessionDetailView } from "@/features/operations/components/staff-session-detail-view";

export default function StaffSessionPage({ params }: { params: { id: string } }) {
  return <StaffSessionDetailView sessionId={params.id} />;
}
