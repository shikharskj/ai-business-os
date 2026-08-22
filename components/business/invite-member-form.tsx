"use client";

import { useActionState } from "react";

import { inviteMemberAction, type ActionState } from "@/app/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionFeedback } from "@/lib/feedback/use-action-feedback";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ActionState = {};

function FieldError({
  name,
  fieldErrors,
}: {
  name: string;
  fieldErrors?: Record<string, string>;
}) {
  const message = fieldErrors?.[name];
  if (!message) {
    return null;
  }

  return (
    <p className="text-base text-destructive" role="alert">
      {message}
    </p>
  );
}

export function InviteMemberForm() {
  const [state, formAction, isPending] = useActionState(
    inviteMemberAction,
    initialState
  );
  useActionFeedback(state, { errorTitle: "Could not send invitation" });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="emailAddress" className="text-base font-medium">
          Email address
        </label>
        <Input
          id="emailAddress"
          name="emailAddress"
          type="email"
          placeholder="colleague@example.com"
          required
        />
        <FieldError name="emailAddress" fieldErrors={state.fieldErrors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="role" className="text-base font-medium">
          Role
        </label>
        <Select name="role" defaultValue="STAFF" items={{ ADMIN: "Admin", STAFF: "Staff", ACCOUNTANT: "Accountant" }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
            <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
          </SelectContent>
        </Select>
        <FieldError name="role" fieldErrors={state.fieldErrors} />
      </div>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Sending invitation">Send invitation</SubmitButton>

    </form>
  );
}
