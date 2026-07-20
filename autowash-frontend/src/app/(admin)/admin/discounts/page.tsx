import { redirect } from "next/navigation";

export default function AdminDiscountsRedirectPage() {
  redirect("/admin/promotions");
}
