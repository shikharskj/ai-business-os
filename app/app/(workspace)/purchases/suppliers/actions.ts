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
import {
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  supplierInputSchema,
  PartyError,
} from "@/modules/party";
import type { PartyGstRegistrationStatus, Supplier } from "@/modules/party/domain/types";

export type SupplierActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Partial<Supplier>;
};

function gstRegistrationStatusFromForm(
  value: FormDataEntryValue | null
): PartyGstRegistrationStatus {
  if (
    value === "REGISTERED" ||
    value === "COMPOSITION" ||
    value === "NOT_REGISTERED"
  ) {
    return value;
  }
  return "NOT_REGISTERED";
}

function submittedSupplierValues(formData: FormData): Partial<Supplier> {
  return {
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    billingAddressLine1: String(formData.get("billingAddressLine1") || ""),
    billingAddressLine2: String(formData.get("billingAddressLine2") || ""),
    city: String(formData.get("city") || ""),
    state: String(formData.get("state") || ""),
    postalCode: String(formData.get("postalCode") || ""),
    country: String(formData.get("country") || "IN"),
    gstRegistrationStatus: gstRegistrationStatusFromForm(
      formData.get("gstRegistrationStatus")
    ),
    gstin: String(formData.get("gstin") || ""),
  };
}


function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path.join(".") || "form",
      issue.message,
    ])
  );
}

function readSupplierFields(formData: FormData) {
  return supplierInputSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    billingAddressLine1: formData.get("billingAddressLine1") || undefined,
    billingAddressLine2: formData.get("billingAddressLine2") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    country: formData.get("country") || "IN",
    gstRegistrationStatus:
      formData.get("gstRegistrationStatus") || "NOT_REGISTERED",
    gstin: formData.get("gstin") || undefined,
  });
}

export async function createSupplierAction(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  let supplierId: string;
  const submittedValues = submittedSupplierValues(formData);

  try {
    const tenant = await authorize("supplier:create");
    const fields = readSupplierFields(formData);
    const supplier = await createSupplier({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      fields,
      prisma,
    });
    supplierId = supplier.id;
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to create suppliers." };
    }
    if (error instanceof PartyError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/purchases/suppliers");
  const returnTo = parseReturnToValue(String(formData.get("returnTo") || ""));
  if (returnTo) {
    const redirectUrl = buildRedirectAfterEntityCreate({
      entity: "supplier",
      entityId: supplierId,
      returnTo: returnTo.href,
    });
    if (redirectUrl) {
      revalidatePath(returnTo.pathname);
      redirect(redirectUrl);
    }
  }
  redirect(`/app/purchases/suppliers/${supplierId}?created=1`);
}

export async function updateSupplierAction(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const supplierId = String(formData.get("supplierId") ?? "");
  const submittedValues = submittedSupplierValues(formData);

  try {
    const tenant = await authorize("supplier:update");
    const fields = readSupplierFields(formData);
    await updateSupplier({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      supplierId,
      fields,
      prisma,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to update this supplier." };
    }
    if (error instanceof PartyError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/purchases/suppliers");
  revalidatePath(`/app/purchases/suppliers/${supplierId}`);
  redirect(`/app/purchases/suppliers/${supplierId}?saved=1`);
}

export async function deactivateSupplierAction(
  supplierId: string
): Promise<SupplierActionState> {
  try {
    const tenant = await authorize("supplier:update");
    await deactivateSupplier({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      supplierId,
      prisma,
    });

    revalidatePath("/app/purchases/suppliers");
    revalidatePath(`/app/purchases/suppliers/${supplierId}`);
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to deactivate this supplier." };
    }
    if (error instanceof PartyError) {
      return { error: error.message };
    }
    throw error;
  }
}
