import { StatusBadge } from "@/components/business/status-badge";
import type { PendingInvitationRow } from "@/modules/tenant/application/list-organization-members";

export function PendingInvitationsList({
  invitations,
}: {
  invitations: PendingInvitationRow[];
}) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-medium">Pending invitations</h3>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="font-medium">{invitation.emailAddress}</p>
              <p className="text-sm text-muted-foreground">
                Invited as {invitation.role.replace("org:", "")}
              </p>
            </div>
            <StatusBadge tone="warning" size="sm">
              {invitation.status}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </div>
  );
}
