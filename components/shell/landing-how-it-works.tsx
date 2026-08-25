import { LandingProductShot } from "@/components/shell/landing-product-shot";

const STEPS = [
  {
    step: 1,
    title: "Create your account",
    description: "Sign up securely and start your workspace in minutes.",
  },
  {
    step: 2,
    title: "Set up your business workspace",
    description:
      "Add your business profile, GST details, and financial year.",
  },
  {
    step: 3,
    title: "Record sales and see what needs attention",
    description:
      "Create invoices and let the Daily Brief surface what matters today.",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-border px-6 py-16"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Get started in three steps.
            </h2>
            <p className="text-base text-muted-foreground">
              From account to daily operations — without a complicated rollout.
            </p>
          </div>
          <ol className="flex flex-col gap-6">
            {STEPS.map(({ step, title, description }) => (
              <li key={step} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                  {step}
                </span>
                <div className="flex flex-col gap-1 pt-0.5">
                  <p className="text-base font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <LandingProductShot
          src="/landing/business-settings.png"
          alt="Business settings showing profile, GST registration, and autonomy policy"
        />
      </div>
    </section>
  );
}
