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
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() =>
    defaultValue ? calendarDateFromIso(defaultValue) : undefined
  )
  const selectedDate = date ?? internalDate
  const isoValue = selectedDate ? isoFromCalendarDate(selectedDate) : ""

  const handleSelect = (nextDate: Date | undefined) => {
    if (date === undefined) {
      setInternalDate(nextDate)
    }

    onSelect?.(nextDate)
    setOpen(false)
  }

  return (
    <div className="w-full">
      {name ? <input type="hidden" name={name} value={isoValue} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
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
            selected={selectedDate}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
