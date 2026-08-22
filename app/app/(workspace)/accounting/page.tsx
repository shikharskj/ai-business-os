import { redirect } from "next/navigation";

export default function AccountingOverviewPage() {
  redirect("/app/accounting/journals");
}
