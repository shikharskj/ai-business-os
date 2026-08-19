import { Construction } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export function ComingSoon({
  title,
  module,
}: {
  title: string;
  module: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Coming soon"
        description={`The ${module} module is not yet available. It will be implemented in an upcoming update.`}
      />
    </div>
  );
}
