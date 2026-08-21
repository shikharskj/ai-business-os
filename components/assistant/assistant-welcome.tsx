"use client";

/**
 * Empty-state welcome for the assistant sheet: soft motion + short copy.
 */
export function AssistantWelcome() {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8 text-center">
      <div className="relative mb-4">
        <div
          className="absolute inset-0 scale-150 rounded-full bg-sidebar-accent/80 opacity-0 animate-in fade-in zoom-in-95 duration-700"
          aria-hidden
        />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-sidebar-border bg-card shadow-sm animate-in fade-in zoom-in-95 duration-500">
          <WelcomeMark />
        </div>
      </div>
      <h2 className="text-lg font-medium text-sidebar-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
        How can I help?
      </h2>
      <p className="mt-1.5 max-w-[20rem] text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
        Ask about sales, receivables, stock, or expenses. Figures come from your
        business records.
      </p>
    </div>
  );
}

function WelcomeMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-8 text-sidebar-foreground"
      aria-hidden
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="28"
        rx="8"
        className="fill-sidebar-accent stroke-sidebar-border"
        strokeWidth="1.5"
      />
      <circle cx="18" cy="24" r="2.5" className="fill-current" />
      <circle cx="30" cy="24" r="2.5" className="fill-current" />
      <path
        d="M16 31c2.5 2.5 13.5 2.5 16 0"
        className="fill-none stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M34 8l1.2 2.6L38 12l-2.8 1.2L34 16l-1.2-2.8L30 12l2.8-1.4L34 8z"
        className="fill-current opacity-70 animate-pulse"
      />
    </svg>
  );
}
