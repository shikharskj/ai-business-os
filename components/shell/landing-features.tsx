import {
  Bot,
  FileText,
  Package,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: FileText,
    title: "Sales and GST invoices",
    description:
      "Quotations, tax invoices, and payments with GST-ready records for Indian SMEs.",
  },
  {
    icon: Package,
    title: "Purchases, expenses, and stock",
    description:
      "Suppliers, bills, expenses, and inventory movements tied to your books.",
  },
  {
    icon: Sparkles,
    title: "Daily Brief",
    description:
      "Needs attention surfaces overdue invoices, low stock, and idle quotations.",
  },
  {
    icon: Bot,
    title: "AI companion",
    description:
      "Ask grounded questions and confirm actions before anything changes.",
  },
];

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-border bg-muted/40 px-6 py-16"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-2 text-center md:text-left">
          <h2 className="text-2xl font-semibold tracking-tight">
            Everything you need to run the business.
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Essential operations and a clear attention surface — without ERP
            clutter.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="border border-border bg-card shadow-none ring-0"
            >
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
