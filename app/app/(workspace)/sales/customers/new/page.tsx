import Link from "next/link";

import { CreateCustomerForm } from "@/components/business/create-customer-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  parseReturnToValue,
  returnToBackLabel,
} from "@/lib/navigation/entity-create-return";
import { authorize } from "@/lib/security";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  await authorize("customer:create");
  const params = await searchParams;
  const returnToValue = parseReturnToValue(params.returnTo ?? null);
  const backHref = returnToValue?.href ?? "/app/sales/customers";
  const backLabel = returnToValue
    ? returnToBackLabel(returnToValue.pathname)
    : "Back to customers";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title="New customer"
        description="Add a customer you sell to. Outstanding balances appear after invoices are recorded."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={backHref} />}
          >
            {backLabel}
          </Button>
        }
      />
      <Card>
        <CardContent>
          <CreateCustomerForm returnTo={returnToValue?.href ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
