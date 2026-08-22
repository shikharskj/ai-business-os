import Link from "next/link";

import { CreateSupplierForm } from "@/components/business/create-supplier-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  parseReturnToValue,
  returnToBackLabel,
} from "@/lib/navigation/entity-create-return";
import { authorize } from "@/lib/security";

export default async function NewSupplierPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  await authorize("supplier:create");
  const params = await searchParams;
  const returnToValue = parseReturnToValue(params.returnTo ?? null);
  const backHref = returnToValue?.href ?? "/app/purchases/suppliers";
  const backLabel = returnToValue
    ? returnToBackLabel(returnToValue.pathname)
    : "Back to suppliers";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title="New supplier"
        description="Add a supplier you buy from. Outstanding payables appear after bills are recorded."
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
          <CreateSupplierForm returnTo={returnToValue?.href ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
