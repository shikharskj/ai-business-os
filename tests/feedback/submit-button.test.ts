/** @vitest-environment jsdom */

import { createRoot } from "react-dom/client";
import { act, createElement } from "react";
import { describe, expect, it } from "vitest";

import { SubmitButton } from "@/components/ui/submit-button";

function render(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("SubmitButton", () => {
  it("shows spinner and aria-busy when pending", () => {
    const view = render(
      createElement(
        SubmitButton,
        { pending: true, pendingLabel: "Saving" },
        "Save changes"
      )
    );

    const button = view.container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-busy")).toBe("true");
    expect(button?.textContent).toContain("Saving");
    expect(button?.querySelector("[data-slot=spinner]")).not.toBeNull();
    expect(button?.disabled).toBe(true);

    view.cleanup();
  });

  it("renders label when not pending", () => {
    const view = render(
      createElement(SubmitButton, { pending: false }, "Save changes")
    );

    const button = view.container.querySelector("button");
    expect(button?.textContent).toBe("Save changes");
    expect(button?.getAttribute("aria-busy")).toBeNull();
    expect(button?.disabled).toBe(false);

    view.cleanup();
  });
});
