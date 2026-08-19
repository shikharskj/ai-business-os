import Link from "next/link";

import { CreateSupplierForm } from "@/components/business/create-supplier-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";

export default async function NewSupplierPage() {
  await authorize("supplier:create");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title="New supplier"
        description="Add a supplier you buy from. Outstanding payables appear after bills are recorded."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/purchases/suppliers" />}
          >
            Back to suppliers
          </Button>
        }
      />
      <Card>
        <CardContent>
          <CreateSupplierForm />
        </CardContent>
      </Card>
    </div>
  );
}
