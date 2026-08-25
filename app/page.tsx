import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingCtaBand } from "@/components/shell/landing-cta-band";
import { LandingFeatureBand } from "@/components/shell/landing-feature-band";
import { LandingFeatures } from "@/components/shell/landing-features";
import { LandingFooter } from "@/components/shell/landing-footer";
import { LandingHowItWorks } from "@/components/shell/landing-how-it-works";
import { LandingProductShot } from "@/components/shell/landing-product-shot";
import { PublicHeader } from "@/components/shell/public-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AI Business OS",
  description:
    "AI-native workspace for small Indian businesses — GST-ready books, Daily Brief, and a grounded business companion.",
};

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/app");
  }

  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 flex-col bg-accent">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 py-16 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
          <div className="flex max-w-3xl flex-col items-center gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Know what your business needs today.
              </h1>
              <p className="text-base text-muted-foreground md:text-lg">
                Keep correct books, surface what needs attention, and act with
                confidence — built for small Indian businesses.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/sign-up" />}
              >
                Create account
              </Button>
              <Button
                size="lg"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                Sign in
              </Button>
            </div>
          </div>
          <LandingProductShot
            src="/landing/dashboard-light.png"
            alt="Dashboard with sales metrics, Needs attention brief, and recent activity"
            priority
            className="max-w-5xl"
          />
        </section>

        <LandingFeatureBand
          title="See what needs attention — every day."
          description="The Daily Brief ranks overdue invoices, low stock, and idle quotations so you know where to act next."
          bullets={[
            "Needs attention queue shared by dashboard and assistant",
            "Prepare reminders and open the right record in one step",
            "Grounded facts — not decorative charts",
          ]}
          imageSrc="/landing/dashboard-light.png"
          imageAlt="Dashboard Needs attention panel with overdue customer actions"
        />

        <LandingFeatureBand
                  muted

          reverse
          title="Sales and GST invoices that stay correct."
          description="Quotations through tax invoices, payments, and outstanding — with GST-ready records for Indian SMEs."
          bullets={[
            "Filter and search invoices by customer, status, and date",
            "Track unpaid, partially paid, and draft documents",
            "Posting updates stock and accounts together",
          ]}
          imageSrc="/landing/invoices-list.png"
          imageAlt="Invoices list with GST amounts, outstanding balances, and status badges"
        />

        <LandingFeatureBand
          title="Document detail with tax preview and activity."
          description="Open an invoice to see GST breakdown, line items, payments, and a live tax-invoice preview."
          bullets={[
            "GST breakdown, outstanding, and journal links",
            "Printable tax invoice preview beside the record",
            "Activity timeline for create, post, and payment events",
          ]}
          imageSrc="/landing/invoice-detail.png"
          imageAlt="Invoice detail with GST breakdown, line items, and tax invoice preview"
        />

        <LandingFeatureBand
        muted
          reverse
          title="Light and dark — same clear workspace."
          description="Work in the theme that fits your day. Financial status colors stay readable in both modes."
          bullets={[
            "System, light, or dark preference persists across sessions",
            "Sidebar, KPIs, and Daily Brief stay high-contrast",
            "Built for long sessions with dense business data",
          ]}
          imageSrc="/landing/dashboard-dark.png"
          imageAlt="Dashboard in dark mode with KPIs, chart, and Needs attention"
        />

        <LandingFeatures />
        <LandingHowItWorks />
        <LandingCtaBand />
      </main>

      <LandingFooter />
    </>
  );
}
