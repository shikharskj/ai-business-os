"use client"

import { cn } from "@/lib/utils"

import { Attachment } from "@/components/ui/attachment"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import { ContextMenu } from "@/components/ui/context-menu"
import { Dialog } from "@/components/ui/dialog"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NavigationMenu } from "@/components/ui/navigation-menu"
import { Progress } from "@/components/ui/progress"
import { ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"

import { DataTable } from "@/components/data-table/data-table"
import { DatePicker } from "@/components/date-picker"

const designSystemComponents = {
  Attachment,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Calendar,
  Card,
  ChartContainer,
  Checkbox,
  ContextMenu,
  DataTable,
  DatePicker,
  Dialog,
  DropdownMenu,
  Input,
  NavigationMenu,
  Progress,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  Separator,
  SidebarProvider,
  Skeleton,
  Spinner,
  Table,
  Tabs,
  Textarea,
  Toaster,
  TooltipProvider,
}

export function verifyDesignSystem() {
  const mergedClasses = cn("px-2 py-1", "px-4")

  if (mergedClasses !== "py-1 px-4") {
    throw new Error("cn() did not merge Tailwind classes correctly")
  }

  return Object.keys(designSystemComponents)
}
