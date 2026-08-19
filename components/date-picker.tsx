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

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    undefined
  )
  const selectedDate = date ?? internalDate

  const handleSelect = (nextDate: Date | undefined) => {
    if (date === undefined) {
      setInternalDate(nextDate)
    }

    onSelect?.(nextDate)
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            data-empty={!selectedDate}
            className={cn(
              "justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon />
        {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}
