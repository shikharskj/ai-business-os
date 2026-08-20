import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardDateFilter({
  preset,
  from,
  to,
}: {
  preset: "this_month" | "custom";
  from: string;
  to: string;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3" method="get">
      <div className="flex flex-col gap-2">
        <label htmlFor="range" className="text-base font-medium">
          Period
        </label>
        <select
          id="range"
          name="range"
          defaultValue={preset}
          className="h-10 rounded-md border border-input bg-background px-3 text-base"
        >
          <option value="this_month">This month</option>
          <option value="custom">Custom range</option>
        </select>
      </div>
      <div className="flex w-40 flex-col gap-2">
        <label htmlFor="from" className="text-base font-medium">
          From
        </label>
        <Input id="from" name="from" type="date" defaultValue={from} />
      </div>
      <div className="flex w-40 flex-col gap-2">
        <label htmlFor="to" className="text-base font-medium">
          To
        </label>
        <Input id="to" name="to" type="date" defaultValue={to} />
      </div>
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}
