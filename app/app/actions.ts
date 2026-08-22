"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import {
  clerkInvitationGateway,
  clerkOrganizationGateway,
  requireTenantForTrustedResource,
} from "@/lib/tenant";
import { authorize } from "@/lib/security";
import {
  createPrismaBusinessStateConsumerDeps,
  rebuildBusinessStateProjections,
} from "@/modules/business-state";
import {
  createBusinessWithOrganization,
  inviteOrganizationMember,
  updateAutonomyPolicy,
  updateBusinessProfile,
} from "@/modules/tenant";
import { assignMemberRole } from "@/modules/tenant/application/assign-role";
import {
  businessProfileInputSchema,
  inviteMemberInputSchema,
} from "@/modules/tenant/schemas/business-profile.schema";
import {
  prismaBusinessRepository,
  prismaMembershipRepository,
} from "@/modules/tenant/infrastructure/prisma-repositories";
import { prismaAutonomyPolicyRepository } from "@/modules/tenant/infrastructure/prisma-autonomy-policy-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { prismaAccountRepository } from "@/modules/accounting/infrastructure/prisma-accounting-repositories";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  clerkOrganizationId?: string;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path.join(".") || "form",
      issue.message,
    ])
  );
}

function buildIdempotencyKey(ownerId: string, name: string): string {
  return createHash("sha256").update(`${ownerId}:${name.trim().toLowerCase()}`).digest("hex");
}

export async function createBusinessAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const owner = await requireCurrentUser();

  let profile;

  try {
    profile = businessProfileInputSchema.parse({
      name: formData.get("name"),
      type: formData.get("type"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2") || undefined,
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country") || "IN",
      phone: formData.get("phone"),
      email: formData.get("email"),
      gstRegistrationStatus: formData.get("gstRegistrationStatus"),
      gstin: formData.get("gstin") || undefined,
      financialYearStartMonth: formData.get("financialYearStartMonth") || 4,
      timezone: formData.get("timezone") || "Asia/Kolkata",
      currency: formData.get("currency") || "INR",
      defaultGstRateBps: formData.get("defaultGstRateBps") || 1800,
      lowStockThreshold: formData.get("lowStockThreshold") || "5",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error) };
    }

    throw error;
  }

  try {
    const result = await createBusinessWithOrganization({
      owner,
      profile,
      idempotencyKey: buildIdempotencyKey(owner.id, profile.name),
      businessRepository: prismaBusinessRepository,
      membershipRepository: prismaMembershipRepository,
      clerkOrganizationGateway,
      chartOfAccountsSeeder: {
        ensureForTenant: (tenantId) =>
          ensureChartOfAccounts({
            tenantId,
            accountRepository: prismaAccountRepository,
          }),
      },
    });

    revalidatePath("/app");
    revalidatePath("/app/settings");

    return { clerkOrganizationId: result.clerkOrganizationId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create business workspace",
    };
  }
}

export async function updateBusinessProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const tenant = await authorize("settings:update");

  let profile;

  try {
    profile = businessProfileInputSchema.parse({
      name: formData.get("name"),
      type: formData.get("type"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2") || undefined,
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country") || "IN",
      phone: formData.get("phone"),
      email: formData.get("email"),
      gstRegistrationStatus: formData.get("gstRegistrationStatus"),
      gstin: formData.get("gstin") || undefined,
      financialYearStartMonth: formData.get("financialYearStartMonth") || 4,
      timezone: formData.get("timezone") || "Asia/Kolkata",
      currency: formData.get("currency") || "INR",
      defaultGstRateBps: formData.get("defaultGstRateBps") || 1800,
      lowStockThreshold: formData.get("lowStockThreshold") || tenant.business.lowStockThreshold,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error) };
    }

    throw error;
  }

  const lowStockThresholdChanged =
    profile.lowStockThreshold !== tenant.business.lowStockThreshold;

  try {
    await updateBusinessProfile({
      tenantId: tenant.tenantId,
      profile,
      businessRepository: prismaBusinessRepository,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to update business profile",
    };
  }

  if (lowStockThresholdChanged) {
    const deps = createPrismaBusinessStateConsumerDeps(prisma);
    const context = await deps.resolveTenantContext(tenant.tenantId);
    if (context) {
      await rebuildBusinessStateProjections({
        tenantId: tenant.tenantId,
        timezone: context.timezone,
        lowStockThresholdMajor: context.lowStockThresholdMajor,
        currency: context.currency,
        sales: deps.sales,
        payments: deps.payments,
        catalog: deps.catalog,
        inventory: deps.inventory,
        expenses: deps.expenses,
        accounts: deps.accounts,
        journals: deps.journals,
        projections: deps.projections,
        attention: deps.attention,
        families: ["attentionQueue", "inventoryRisk"],
        markRebuilt: true,
      });
    }
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");
  redirect("/app/settings?saved=1");
}

export async function updateAutonomyPolicyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const tenant = await authorize("settings:update");

  const update = {
    enablePaymentReminderL4: formData.get("enablePaymentReminderL4") === "on",
    paymentReminderAmountThreshold: String(
      formData.get("paymentReminderAmountThreshold") ?? ""
    ).trim(),
    paymentReminderRequireConfirmationAbove: String(
      formData.get("paymentReminderRequireConfirmationAbove") ?? ""
    ).trim(),
    disabledAutomations: [] as string[],
  };

  try {
    await updateAutonomyPolicy({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      update,
      policies: prismaAutonomyPolicyRepository,
      audit: createPrismaAuditRepository(prisma),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error) };
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to update autonomy policy",
    };
  }

  revalidatePath("/app/settings");
  redirect("/app/settings?saved=autonomy");
}

export async function inviteMemberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCurrentUser();
  const tenant = await authorize("settings:update");

  let invite;

  try {
    invite = inviteMemberInputSchema.parse({
      emailAddress: formData.get("emailAddress"),
      role: formData.get("role") || "STAFF",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error) };
    }

    throw error;
  }

  try {
    await inviteOrganizationMember({
      clerkOrganizationId: tenant.business.clerkOrganizationId,
      emailAddress: invite.emailAddress,
      role: invite.role,
      inviterClerkUserId: user.clerkUserId,
      invitationGateway: clerkInvitationGateway,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to send invitation",
    };
  }

  revalidatePath("/app/settings/members");
  redirect("/app/settings/members?invited=1");
}

export async function assertTenantAccessAction(clientTenantId: string) {
  await requireTenantForTrustedResource({ tenantId: clientTenantId });
}

export async function assignMemberRoleAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const tenant = await authorize("settings:role:assign");

  const targetUserId = formData.get("targetUserId");
  const newRole = formData.get("role");

  if (typeof targetUserId !== "string" || !targetUserId) {
    return { error: "Target user is required" };
  }

  if (
    typeof newRole !== "string" ||
    !["ADMIN", "STAFF", "ACCOUNTANT"].includes(newRole)
  ) {
    return { error: "Invalid role" };
  }

  try {
    await assignMemberRole({
      targetUserId,
      tenantId: tenant.tenantId,
      newRole: newRole as "ADMIN" | "STAFF" | "ACCOUNTANT",
      membershipRepository: prismaMembershipRepository,
    });

    revalidatePath("/app/settings/members");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to assign role",
    };
  }
}
