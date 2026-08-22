"use client";

import { useActionState, useMemo, useState } from "react";

import {
  postAdjustmentAction,
  type AccountingActionState,
} from "@/app/app/(workspace)/accounting/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/modules/shared-kernel/format-money";
import { money, moneyFromMajor } from "@/modules/shared-kernel/money";

export type AdjustmentAccountOption = {
  code: string;
  name: string;
};

type LineState = {
  accountCode: string;
  description: string;
  debit: string;
  credit: string;
};

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

function parseAmount(value: string): { valid: boolean; amount: bigint } {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") {
    return { valid: true, amount: 0n };
  }
  try {
    return { valid: true, amount: moneyFromMajor(trimmed).amountMinor };
  } catch {
    return { valid: false, amount: 0n };
  }
}

export function PostAdjustmentForm({
  accounts,
  today,
}: {
  accounts: AdjustmentAccountOption[];
  today: string;
}) {
  const [state, formAction, isPending] = useActionState(
    postAdjustmentAction,
    {} as AccountingActionState
  );
  const [lines, setLines] = useState<LineState[]>([
    { accountCode: accounts[0]?.code ?? "", description: "", debit: "", credit: "" },
    { accountCode: accounts[1]?.code ?? accounts[0]?.code ?? "", description: "", debit: "", credit: "" },
  ]);

  const accountItems = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.code, `${account.code} · ${account.name}`])),
    [accounts]
  );

  const debitParsed = lines.map((line) => parseAmount(line.debit));
  const creditParsed = lines.map((line) => parseAmount(line.credit));
  const hasInvalidAmount = debitParsed.some((p) => !p.valid) || creditParsed.some((p) => !p.valid);

  const debitTotal = debitParsed.reduce((sum, p) => sum + p.amount, 0n);
  const creditTotal = creditParsed.reduce((sum, p) => sum + p.amount, 0n);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lineCount" value={String(lines.length)} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="accountingDate" className="text-base font-medium">
            Accounting date
          </label>
          <Input
            id="accountingDate"
            name="accountingDate"
            type="date"
            required
            defaultValue={today}
          />
          <FieldError name="accountingDate" fieldErrors={state.fieldErrors} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="memo" className="text-base font-medium">
          Memo
        </label>
        <Textarea id="memo" name="memo" rows={2} placeholder="Reason for adjustment" />
        <FieldError name="memo" fieldErrors={state.fieldErrors} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Lines</h2>
        <FieldError name="lines" fieldErrors={state.fieldErrors} />
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium">
            <span>Account</span>
            <span>Description</span>
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
          </div>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Select
                value={line.accountCode}
                onValueChange={(value) => {
                  const next = String(value ?? "");
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, accountCode: next } : row
                    )
                  );
                }}
                items={accountItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.code} value={account.code}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name={`line-${index}-accountCode`} value={line.accountCode} />
              <Input
                name={`line-${index}-description`}
                value={line.description}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index
                        ? { ...row, description: event.target.value }
                        : row
                    )
                  )
                }
                placeholder="Optional"
              />
              <Input
                name={`line-${index}-debit`}
                inputMode="decimal"
                className="text-right"
                value={line.debit}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, debit: event.target.value } : row
                    )
                  )
                }
                placeholder="0.00"
              />
              <Input
                name={`line-${index}-credit`}
                inputMode="decimal"
                className="text-right"
                value={line.credit}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, credit: event.target.value } : row
                    )
                  )
                }
                placeholder="0.00"
              />
            </div>
          ))}
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setLines((current) => [
                ...current,
                {
                  accountCode: accounts[0]?.code ?? "",
                  description: "",
                  debit: "",
                  credit: "",
                },
              ])
            }
          >
            Add line
          </Button>
        </div>
      </section>

      <section className="rounded-md border border-border bg-muted/30 p-4 text-base">
        <p>
          Debits {formatINR(money(debitTotal))} · Credits{" "}
          {formatINR(money(creditTotal))}
          {hasInvalidAmount
            ? " · invalid"
            : debitTotal !== creditTotal
              ? " · unbalanced"
              : " · balanced"}
        </p>
      </section>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <SubmitButton
          pending={isPending}
          pendingLabel="Posting"
          disabled={accounts.length === 0}
        >
          Post adjustment
        </SubmitButton>
      </div>
    </form>
  );
}
