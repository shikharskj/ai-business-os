import { z } from "zod";

const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "GSTIN must be a valid 15-character GSTIN"
  );

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must be at most 15 digits")
  .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters");

export function createPartyInputSchema(nameRequiredMessage: string) {
  return z
    .object({
      name: z.string().trim().min(2, nameRequiredMessage),
      phone: z.string().optional(),
      email: z.string().optional(),
      billingAddressLine1: optionalText,
      billingAddressLine2: optionalText,
      city: optionalText,
      state: optionalText,
      postalCode: optionalText,
      country: z.string().trim().min(2).optional().default("IN"),
      gstRegistrationStatus: z.enum([
        "NOT_REGISTERED",
        "REGISTERED",
        "COMPOSITION",
      ]),
      gstin: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      const phone = value.phone?.trim();
      if (phone) {
        const parsed = phoneSchema.safeParse(phone);
        if (!parsed.success) {
          ctx.addIssue({
            code: "custom",
            message: parsed.error.issues[0]?.message ?? "Invalid phone number",
            path: ["phone"],
          });
        }
      }

      const email = value.email?.trim();
      if (email) {
        const parsed = z
          .string()
          .email("Enter a valid email address")
          .safeParse(email);
        if (!parsed.success) {
          ctx.addIssue({
            code: "custom",
            message: parsed.error.issues[0]?.message ?? "Invalid email",
            path: ["email"],
          });
        }
      }

      const gstin = value.gstin?.trim();
      if (value.gstRegistrationStatus === "NOT_REGISTERED" && gstin) {
        ctx.addIssue({
          code: "custom",
          message: "GSTIN must be empty when GST is not registered",
          path: ["gstin"],
        });
      }

      if (
        (value.gstRegistrationStatus === "REGISTERED" ||
          value.gstRegistrationStatus === "COMPOSITION") &&
        !gstin
      ) {
        ctx.addIssue({
          code: "custom",
          message: "GSTIN is required when GST registration is enabled",
          path: ["gstin"],
        });
      }

      if (gstin) {
        const parsed = gstinSchema.safeParse(gstin);
        if (!parsed.success) {
          ctx.addIssue({
            code: "custom",
            message: parsed.error.issues[0]?.message ?? "Invalid GSTIN",
            path: ["gstin"],
          });
        }
      }

      const postalCode = value.postalCode?.trim();
      if (postalCode && !/^\d{6}$/.test(postalCode)) {
        ctx.addIssue({
          code: "custom",
          message: "PIN code must be exactly 6 digits",
          path: ["postalCode"],
        });
      }
    });
}

export const partySearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).optional().default("ACTIVE"),
});
