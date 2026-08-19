import { z } from "zod";

const organizationDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().optional(),
  created_by: z.string().optional(),
});

const organizationMembershipDataSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  organization: organizationDataSchema,
  public_user_data: z.object({
    user_id: z.string().min(1),
  }),
});

export type OrganizationLifecycleEvent =
  | { type: "organization.created"; clerkOrganizationId: string; name: string; createdByClerkUserId: string | null }
  | { type: "organization.updated"; clerkOrganizationId: string; name: string }
  | { type: "organization.deleted"; clerkOrganizationId: string };

export type OrganizationMembershipLifecycleEvent =
  | {
      type: "organizationMembership.created";
      clerkOrganizationMembershipId: string;
      clerkOrganizationId: string;
      clerkUserId: string;
      clerkRole: string;
    }
  | {
      type: "organizationMembership.updated";
      clerkOrganizationMembershipId: string;
      clerkOrganizationId: string;
      clerkUserId: string;
      clerkRole: string;
    }
  | {
      type: "organizationMembership.deleted";
      clerkOrganizationMembershipId: string;
      clerkOrganizationId: string;
      clerkUserId: string;
    };

export type TenantLifecycleEvent =
  | OrganizationLifecycleEvent
  | OrganizationMembershipLifecycleEvent;

const ORGANIZATION_TYPES = new Set([
  "organization.created",
  "organization.updated",
  "organization.deleted",
]);

const MEMBERSHIP_TYPES = new Set([
  "organizationMembership.created",
  "organizationMembership.updated",
  "organizationMembership.deleted",
]);

export function parseTenantLifecycleEvent(input: {
  type: string;
  data: unknown;
}): TenantLifecycleEvent | null {
  if (ORGANIZATION_TYPES.has(input.type)) {
    const data = organizationDataSchema.parse(input.data);

    if (input.type === "organization.deleted") {
      return {
        type: "organization.deleted",
        clerkOrganizationId: data.id,
      };
    }

    if (input.type === "organization.updated") {
      return {
        type: "organization.updated",
        clerkOrganizationId: data.id,
        name: data.name,
      };
    }

    return {
      type: "organization.created",
      clerkOrganizationId: data.id,
      name: data.name,
      createdByClerkUserId: data.created_by ?? null,
    };
  }

  if (MEMBERSHIP_TYPES.has(input.type)) {
    const data = organizationMembershipDataSchema.parse(input.data);

    if (input.type === "organizationMembership.deleted") {
      return {
        type: "organizationMembership.deleted",
        clerkOrganizationMembershipId: data.id,
        clerkOrganizationId: data.organization.id,
        clerkUserId: data.public_user_data.user_id,
      };
    }

    if (input.type === "organizationMembership.updated") {
      return {
        type: "organizationMembership.updated",
        clerkOrganizationMembershipId: data.id,
        clerkOrganizationId: data.organization.id,
        clerkUserId: data.public_user_data.user_id,
        clerkRole: data.role,
      };
    }

    return {
      type: "organizationMembership.created",
      clerkOrganizationMembershipId: data.id,
      clerkOrganizationId: data.organization.id,
      clerkUserId: data.public_user_data.user_id,
      clerkRole: data.role,
    };
  }

  return null;
}
