"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function calendarDateFromIso(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return undefined
  }
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }
  return date
}

function isoFromCalendarDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

interface DatePickerProps {
  id?: string
  name?: string
  defaultValue?: string
  /** Controlled ISO date (`YYYY-MM-DD`). */
  value?: string
  /** Called with ISO date or empty string when cleared. */
  onValueChange?: (iso: string) => void
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  id,
  name,
  defaultValue,
  value,
  onValueChange,
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() => {
    if (value !== undefined) {
      return value ? calendarDateFromIso(value) : undefined
    }
    return defaultValue ? calendarDateFromIso(defaultValue) : undefined
  })
  const controlledDate =
    value !== undefined ? (value ? calendarDateFromIso(value) : undefined) : undefined
  const selectedDate = date ?? controlledDate ?? internalDate
  const isoValue = selectedDate ? isoFromCalendarDate(selectedDate) : ""
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(
    () => selectedDate ?? new Date()
  )

  const commitDate = (nextDate: Date | undefined, close: boolean) => {
    if (date === undefined && value === undefined) {
      setInternalDate(nextDate)
    }
    if (nextDate) {
      setVisibleMonth(nextDate)
    }
    onSelect?.(nextDate)
    onValueChange?.(nextDate ? isoFromCalendarDate(nextDate) : "")
    if (close) {
      setOpen(false)
    }
  }

  const handleMonthChange = (nextMonth: Date) => {
    setVisibleMonth(nextMonth)
  }

  const handleOpenChange = (
    nextOpen: boolean,
    details: {
      reason: string
      event: Event
      cancel: () => void
    }
  ) => {
    let cancelled = false
    if (!nextOpen) {
      const candidates: Element[] = []
      if (details.event.target instanceof Element) {
        candidates.push(details.event.target)
      }
      if (
        "relatedTarget" in details.event &&
        details.event.relatedTarget instanceof Element
      ) {
        candidates.push(details.event.relatedTarget)
      }

      const hitsSelect = candidates.some((el) =>
        el.closest('[data-slot="select-content"], [data-slot="select-trigger"]')
      )
      const selectMenuOpen = Boolean(
        document.querySelector('[data-slot="select-content"]')
      )

      if (
        hitsSelect ||
        (selectMenuOpen &&
          (details.reason === "outside-press" || details.reason === "focus-out"))
      ) {
        details.cancel()
        cancelled = true
      }
    }

    if (!cancelled) {
      if (nextOpen) {
        setVisibleMonth(selectedDate ?? new Date())
      }
      setOpen(nextOpen)
    }
  }

  return (
    <div className="w-full">
      {name ? <input type="hidden" name={name} value={isoValue} /> : null}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              data-empty={!selectedDate}
              className={cn(
                "h-10 w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
                className
              )}
            />
          }
        >
          <CalendarIcon />
          {selectedDate ? (
            format(selectedDate, "dd MMM yyyy")
          ) : (
            <span>{placeholder}</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            month={visibleMonth}
            onMonthChange={handleMonthChange}
            selected={selectedDate}
            onSelect={(nextDate) => commitDate(nextDate, true)}
            defaultMonth={selectedDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
