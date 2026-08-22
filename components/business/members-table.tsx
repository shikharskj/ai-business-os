"use client";

import { useActionState } from "react";

import {
  assignMemberRoleAction,
  type ActionState,
} from "@/app/app/actions";
import { StatusBadge } from "@/components/business/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionFeedback } from "@/lib/feedback/use-action-feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MembershipRole } from "@/modules/tenant/domain/types";
import type { OrganizationMemberRow } from "@/modules/tenant/application/list-organization-members";

const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
  ACCOUNTANT: "Accountant",
};

const ASSIGNABLE_ROLES = ["ADMIN", "STAFF", "ACCOUNTANT"] as const;

function MemberRoleForm({
  member,
  currentUserId,
}: {
  member: OrganizationMemberRow;
  currentUserId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    assignMemberRoleAction,
    {} as ActionState
  );
  useActionFeedback(state, { errorTitle: "Could not update role" });

  if (member.role === "OWNER" || member.userId === currentUserId) {
    return null;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="targetUserId" value={member.userId} />
      <Select
        name="role"
        defaultValue={member.role}
        items={{
          ADMIN: "Admin",
          STAFF: "Staff",
          ACCOUNTANT: "Accountant",
        }}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNABLE_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SubmitButton pending={isPending} pendingLabel="Saving" size="sm" variant="outline">
        Update
      </SubmitButton>
      {state.error ? (
        <span className="text-sm text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}

export function MembersTable({
  members,
  currentUserId,
  canAssignRoles,
}: {
  members: OrganizationMemberRow[];
  currentUserId: string;
  canAssignRoles: boolean;
}) {
  if (members.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        No members found for this business yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-base">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-sm">
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Role</th>
            {canAssignRoles ? (
              <th className="px-4 py-3 font-medium">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium">
                  {member.name ?? member.email ?? "Member"}
                </p>
                {member.email && member.name ? (
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone="neutral" size="sm">
                  {ROLE_LABELS[member.role]}
                </StatusBadge>
              </td>
              {canAssignRoles ? (
                <td className="px-4 py-3">
                  <MemberRoleForm
                    member={member}
                    currentUserId={currentUserId}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
