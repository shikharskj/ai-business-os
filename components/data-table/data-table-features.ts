import {
  columnVisibilityFeature,
  tableFeatures,
} from "@tanstack/react-table"

export const features = tableFeatures({
  columnVisibilityFeature,
})

export type DataTableFeatures = typeof features
