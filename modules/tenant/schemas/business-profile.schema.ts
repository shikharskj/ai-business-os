import { z } from "zod";

const businessTypeSchema = z.enum([
  "PROPRIETORSHIP",
  "PARTNERSHIP",
  "PRIVATE_LIMITED",
  "LLP",
  "OTHER",
]);

const gstRegistrationStatusSchema = z.enum([
  "NOT_REGISTERED",
  "REGISTERED",
  "COMPOSITION",
]);

const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "GSTIN must be a valid 15-character GSTIN"
  );

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must be at most 15 digits")
  .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters");

const emailSchema = z.string().trim().email("Enter a valid email address");

const financialYearStartMonthSchema = z.coerce
  .number()
  .int()
  .min(1, "Financial year start month must be between 1 and 12")
  .max(12, "Financial year start month must be between 1 and 12");

export const businessProfileInputSchema = z
  .object({
    name: z.string().trim().min(2, "Business name is required"),
    type: businessTypeSchema,
    addressLine1: z.string().trim().min(1, "Address line 1 is required"),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(1, "City is required"),
    state: z.string().trim().min(1, "State is required"),
    postalCode: z.string().trim().min(1, "Postal code is required"),
    country: z.string().trim().min(2).default("IN"),
    phone: phoneSchema,
    email: emailSchema,
    gstRegistrationStatus: gstRegistrationStatusSchema,
    gstin: z.string().trim().optional(),
    financialYearStartMonth: financialYearStartMonthSchema.default(4),
    timezone: z.string().trim().min(1).default("Asia/Kolkata"),
    currency: z.string().trim().length(3).default("INR"),
  })
  .superRefine((value, ctx) => {
    if (value.gstRegistrationStatus === "NOT_REGISTERED" && value.gstin) {
      ctx.addIssue({
        code: "custom",
        message: "GSTIN must be empty when GST is not registered",
        path: ["gstin"],
      });
    }

    if (
      (value.gstRegistrationStatus === "REGISTERED" ||
        value.gstRegistrationStatus === "COMPOSITION") &&
      !value.gstin
    ) {
      ctx.addIssue({
        code: "custom",
        message: "GSTIN is required when GST registration is enabled",
        path: ["gstin"],
      });
    }

    if (value.gstin) {
      const parsed = gstinSchema.safeParse(value.gstin);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: parsed.error.issues[0]?.message ?? "Invalid GSTIN",
          path: ["gstin"],
        });
      }
    }
  });

export type BusinessProfileInput = z.infer<typeof businessProfileInputSchema>;

export const inviteMemberInputSchema = z.object({
  emailAddress: emailSchema,
  role: z.enum(["ADMIN", "STAFF", "ACCOUNTANT"]).default("STAFF"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;

export function slugifyBusinessName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return base.length > 0 ? base : "business";
}
