import { InvalidGstinError } from "@/modules/tax/domain/errors";
import { normalizeGstin } from "@/modules/tax/domain/gstin";
import { PartyValidationError } from "@/modules/party/domain/errors";
import type {
  CustomerInput,
  PartyGstRegistrationStatus,
} from "@/modules/party/domain/types";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeCustomerInput(input: CustomerInput): CustomerInput {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new PartyValidationError("Customer name is required.");
  }

  const gstRegistrationStatus: PartyGstRegistrationStatus =
    input.gstRegistrationStatus;
  const gstinRaw = emptyToNull(input.gstin);

  if (gstRegistrationStatus === "NOT_REGISTERED" && gstinRaw) {
    throw new PartyValidationError(
      "GSTIN must be empty when GST is not registered."
    );
  }

  if (
    (gstRegistrationStatus === "REGISTERED" ||
      gstRegistrationStatus === "COMPOSITION") &&
    !gstinRaw
  ) {
    throw new PartyValidationError(
      "GSTIN is required when GST registration is enabled."
    );
  }

  let gstin: string | null = null;
  if (gstinRaw) {
    try {
      gstin = normalizeGstin(gstinRaw);
    } catch (error) {
      if (error instanceof InvalidGstinError) {
        throw new PartyValidationError("GSTIN must be a valid 15-character GSTIN.");
      }
      throw error;
    }
  }

  return {
    name,
    phone: emptyToNull(input.phone),
    email: emptyToNull(input.email),
    billingAddressLine1: emptyToNull(input.billingAddressLine1),
    billingAddressLine2: emptyToNull(input.billingAddressLine2),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country) ?? "IN",
    gstRegistrationStatus,
    gstin,
  };
}
