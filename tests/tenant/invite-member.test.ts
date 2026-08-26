import { describe, expect, it, vi } from "vitest";

import { inviteOrganizationMember } from "@/modules/tenant/application/invite-member";
import { APP_MEMBERSHIP_ROLE_METADATA_KEY } from "@/modules/tenant/domain/invite-metadata";

describe("inviteOrganizationMember", () => {
  it("sets appMembershipRole on invitation publicMetadata", async () => {
    const createOrganizationInvitation = vi.fn(async () => ({ id: "inv_1" }));

    await inviteOrganizationMember({
      clerkOrganizationId: "org_a",
      emailAddress: "staff@example.com",
      role: "ACCOUNTANT",
      inviterClerkUserId: "user_owner",
      invitationGateway: { createOrganizationInvitation },
    });

    expect(createOrganizationInvitation).toHaveBeenCalledWith({
      clerkOrganizationId: "org_a",
      emailAddress: "staff@example.com",
      role: "ACCOUNTANT",
      inviterClerkUserId: "user_owner",
      publicMetadata: {
        [APP_MEMBERSHIP_ROLE_METADATA_KEY]: "ACCOUNTANT",
      },
    });
  });
});
