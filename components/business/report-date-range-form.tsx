import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";

export function ReportDateRangeForm({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3" method="get">
      <input type="hidden" name="range" value="custom" />
      <div className="flex w-44 flex-col gap-2">
        <label htmlFor="from" className="text-base font-medium">
          From
        </label>
        <DatePicker id="from" name="from" defaultValue={from} />
      </div>
      <div className="flex w-44 flex-col gap-2">
        <label htmlFor="to" className="text-base font-medium">
          To
        </label>
        <DatePicker id="to" name="to" defaultValue={to} />
      </div>
      <Button type="submit" variant="outline">
        Show
      </Button>
    </form>
  );
}
