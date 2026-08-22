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
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  reactivateCustomer,
  customerInputSchema,
  PartyError,
} from "@/modules/party";
import type { Customer, PartyGstRegistrationStatus } from "@/modules/party/domain/types";

export type CustomerActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Partial<Customer>;
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

function submittedCustomerValues(formData: FormData): Partial<Customer> {
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

function readCustomerFields(formData: FormData) {
  return customerInputSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    billingAddressLine1: formData.get("billingAddressLine1") || undefined,
    billingAddressLine2: formData.get("billingAddressLine2") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    country: formData.get("country") || "IN",
    gstRegistrationStatus: formData.get("gstRegistrationStatus") || "NOT_REGISTERED",
    gstin: formData.get("gstin") || undefined,
  });
}

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  let customerId: string;

  const submittedValues = submittedCustomerValues(formData);

  try {
    const tenant = await authorize("customer:create");
    const fields = readCustomerFields(formData);
    const customer = await createCustomer({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      fields,
      prisma,
    });
    customerId = customer.id;
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to create customers." };
    }
    if (error instanceof PartyError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/sales/customers");
  const returnTo = parseReturnToValue(String(formData.get("returnTo") || ""));
  if (returnTo) {
    const redirectUrl = buildRedirectAfterEntityCreate({
      entity: "customer",
      entityId: customerId,
      returnTo: returnTo.href,
    });
    if (redirectUrl) {
      revalidatePath(returnTo.pathname);
      redirect(redirectUrl);
    }
  }
  redirect(`/app/sales/customers/${customerId}?created=1`);
}

export async function updateCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const customerId = String(formData.get("customerId") ?? "");

  const submittedValues = submittedCustomerValues(formData);

  try {
    const tenant = await authorize("customer:update");
    const fields = readCustomerFields(formData);
    await updateCustomer({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      customerId,
      fields,
      prisma,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to update this customer." };
    }
    if (error instanceof PartyError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/sales/customers");
  revalidatePath(`/app/sales/customers/${customerId}`);
  redirect(`/app/sales/customers/${customerId}?saved=1`);
}

export async function deactivateCustomerAction(
  customerId: string
): Promise<CustomerActionState> {
  try {
    const tenant = await authorize("customer:update");
    await deactivateCustomer({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      customerId,
      prisma,
    });

    revalidatePath("/app/sales/customers");
    revalidatePath(`/app/sales/customers/${customerId}`);
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to deactivate this customer." };
    }
    if (error instanceof PartyError) {
      return { error: error.message };
    }
    console.error("Unexpected error deactivating customer:", error);
    throw error;
  }
}

export async function reactivateCustomerAction(
  customerId: string
): Promise<CustomerActionState> {
  try {
    const tenant = await authorize("customer:update");
    await reactivateCustomer({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      customerId,
      prisma,
    });

    revalidatePath("/app/sales/customers");
    revalidatePath(`/app/sales/customers/${customerId}`);
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to reactivate this customer." };
    }
    if (error instanceof PartyError) {
      return { error: error.message };
    }
    console.error("Unexpected error reactivating customer:", error);
    throw error;
  }
}
