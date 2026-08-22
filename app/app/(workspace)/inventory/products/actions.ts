"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import {
  buildRedirectAfterEntityCreate,
  parseReturnToValue,
} from "@/lib/navigation/entity-create-return";
import { authorize, AuthorizationError } from "@/lib/security";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  createProduct,
  updateProduct,
  productInputSchema,
  CatalogError,
} from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import type { ProductKind } from "@/modules/catalog/domain/types";

export type ProductActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: {
    kind?: ProductKind;
    name?: string;
    sku?: string;
    unitOfMeasurement?: string;
    sellingPrice?: string;
    purchasePrice?: string;
    hsnSac?: string;
    taxRateBps?: string;
    category?: string;
    tracksInventory?: boolean;
  };
};

function submittedProductValues(formData: FormData): ProductActionState["values"] {
  return {
    kind:
      formData.get("kind") === "SERVICE" ? "SERVICE" : "PRODUCT",
    name: String(formData.get("name") || ""),
    sku: String(formData.get("sku") || ""),
    unitOfMeasurement: String(formData.get("unitOfMeasurement") || ""),
    sellingPrice: String(formData.get("sellingPrice") || ""),
    purchasePrice: String(formData.get("purchasePrice") || ""),
    hsnSac: String(formData.get("hsnSac") || ""),
    taxRateBps: String(formData.get("taxRateBps") || "1800"),
    category: String(formData.get("category") || ""),
    tracksInventory: formData.get("tracksInventory") === "on",
  };
}

const audit = createPrismaAuditRepository(prisma);
const outbox = createPrismaOutboxRepository(prisma);

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path.join(".") || "form",
      issue.message,
    ])
  );
}

function readProductFields(formData: FormData) {
  return productInputSchema.parse({
    kind: formData.get("kind") || "PRODUCT",
    name: formData.get("name"),
    sku: formData.get("sku"),
    unitOfMeasurement: formData.get("unitOfMeasurement"),
    sellingPrice: formData.get("sellingPrice"),
    purchasePrice: formData.get("purchasePrice"),
    hsnSac: formData.get("hsnSac") || undefined,
    taxRateBps: formData.get("taxRateBps") || "1800",
    category: formData.get("category") || undefined,
    tracksInventory: formData.get("tracksInventory") === "on",
  });
}

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  let productId: string;
  const submittedValues = submittedProductValues(formData);

  try {
    const tenant = await authorize("product:create");
    const fields = readProductFields(formData);
    const product = await createProduct({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      fields,
      catalog: prismaCatalogRepository,
      audit,
      outbox,
    });
    productId = product.id;
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to create products." };
    }
    if (error instanceof CatalogError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/inventory/products");
  const returnTo = parseReturnToValue(String(formData.get("returnTo") || ""));
  if (returnTo) {
    const redirectUrl = buildRedirectAfterEntityCreate({
      entity: "product",
      entityId: productId,
      returnTo: returnTo.href,
    });
    if (redirectUrl) {
      revalidatePath(returnTo.pathname);
      redirect(redirectUrl);
    }
  }
  redirect(`/app/inventory/products/${productId}?created=1`);
}

export async function updateProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const productId = String(formData.get("productId") ?? "");
  const submittedValues = submittedProductValues(formData);

  try {
    const tenant = await authorize("product:update");
    const fields = readProductFields(formData);
    await updateProduct({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      productId,
      fields,
      catalog: prismaCatalogRepository,
      audit,
      outbox,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to update this product." };
    }
    if (error instanceof CatalogError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/inventory/products");
  revalidatePath(`/app/inventory/products/${productId}`);
  redirect(`/app/inventory/products/${productId}?saved=1`);
}
