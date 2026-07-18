import { redirect } from "next/navigation";

type PageProps = {
  searchParams: { sessionId?: string };
};

export default function StaffCheckInPage({ searchParams }: PageProps) {
  redirect("/staff/my-sessions");
}
