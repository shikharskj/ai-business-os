export type PartyKind = "CUSTOMER" | "SUPPLIER";
export type PartyStatus = "ACTIVE" | "INACTIVE";
export type PartyGstRegistrationStatus =
  | "NOT_REGISTERED"
  | "REGISTERED"
  | "COMPOSITION";

export type Party = {
  id: string;
  tenantId: string;
  kind: PartyKind;
  name: string;
  phone: string | null;
  email: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  gstRegistrationStatus: PartyGstRegistrationStatus;
  gstin: string | null;
  status: PartyStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type Customer = Party & { kind: "CUSTOMER" };

export type CustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  gstRegistrationStatus: PartyGstRegistrationStatus;
  gstin?: string | null;
};
