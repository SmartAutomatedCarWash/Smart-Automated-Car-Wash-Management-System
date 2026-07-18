import { StaffMySessionsView } from "@/features/operations/components/staff-my-sessions-view";

type PageProps = {
  searchParams: { sessionId?: string };
};

export default function StaffOperationsPage({ searchParams }: PageProps) {
  return <StaffMySessionsView />;
}
