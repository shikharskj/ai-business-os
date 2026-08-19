import Link from "next/link";

import { CreateCustomerForm } from "@/components/business/create-customer-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";

export default async function NewCustomerPage() {
  await authorize("customer:create");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title="New customer"
        description="Add a customer you sell to. Outstanding balances appear after invoices are recorded."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/sales/customers" />}
          >
            Back to customers
          </Button>
        }
      />
      <Card>
        <CardContent>
          <CreateCustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
