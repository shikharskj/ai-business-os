import Link from "next/link";
import { notFound } from "next/navigation";

import { EditProductForm } from "@/components/business/edit-product-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { CatalogNotFoundError, getProduct } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("product:update");
  const { id } = await params;

  let product;
  try {
    product = await getProduct({
      tenantId: tenant.tenantId,
      productId: id,
      catalog: prismaCatalogRepository,
    });
  } catch (error) {
    if (error instanceof CatalogNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title={`Edit ${product.name}`}
        description="Update catalog details, prices, and tax references."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/inventory/products/${product.id}`} />}
          >
            Cancel
          </Button>
        }
      />
      <Card>
        <CardContent>
          <EditProductForm product={product} />
        </CardContent>
      </Card>
    </div>
  );
}
