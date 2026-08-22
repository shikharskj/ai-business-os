"use client";

import { useActionState } from "react";

import {
  updateProductAction,
  type ProductActionState,
} from "@/app/app/(workspace)/inventory/products/actions";
import { ProductFormFields } from "@/components/business/product-form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Product } from "@/modules/catalog/domain/types";
import { toMajorString } from "@/modules/shared-kernel/money";

const initialState: ProductActionState = {};

export function EditProductForm({ product }: { product: Product }) {
  const [state, formAction, isPending] = useActionState(
    updateProductAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="productId" value={product.id} />
      <ProductFormFields
        defaultValues={
          state.values ?? {
            kind: product.kind,
            name: product.name,
            sku: product.sku,
            unitOfMeasurement: product.unitOfMeasurement,
            sellingPrice: toMajorString(product.sellingPrice),
            purchasePrice: toMajorString(product.purchasePrice),
            hsnSac: product.hsnSac ?? "",
            taxRateBps: String(product.taxRateBps),
            category: product.category ?? "",
            tracksInventory: product.tracksInventory,
          }
        }
        fieldErrors={state.fieldErrors}
      />
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Saving">Save changes</SubmitButton>

    </form>
  );
}
