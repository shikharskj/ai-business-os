"use client";

import { useState } from "react";
import { Bot, Plus, X } from "lucide-react";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Global entry point to the assistant. Sheet-only — no full-page route.
 * Mounted lazily by the sheet so a failing assistant cannot affect the page behind it.
 */
export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="AI business assistant"
          />
        }
      >
        <Bot className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground data-[side=right]:sm:max-w-2xl data-[side=right]:md:max-w-2xl"
      >
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b border-sidebar-border px-4 py-3 text-left">
          <SheetTitle className="text-base font-medium text-sidebar-foreground">
            AI OS
          </SheetTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setChatKey((n) => n + 1)}
            >
              <Plus className="size-3.5" />
              New chat
            </Button>
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close assistant"
                />
              }
            >
              <X className="size-5" />
            </SheetClose>
          </div>
        </SheetHeader>
        <AssistantPanel key={chatKey} className="min-h-0 flex-1" compact />
      </SheetContent>
    </Sheet>
  );
}
