import Link from "next/link";

import { CreateProductForm } from "@/components/business/create-product-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";

export default async function NewProductPage() {
  await authorize("product:create");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="New product"
        description="Add a product or service. GST is not calculated here — the tax engine uses the HSN/SAC and rate you store."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/inventory/products" />}
          >
            Back to products
          </Button>
        }
      />
      <CreateProductForm />
    </div>
  );
}
