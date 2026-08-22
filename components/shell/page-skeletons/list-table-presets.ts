import type { ListFilterField } from "./shared";

export type ListTablePresetName =
  | "invoices"
  | "customers"
  | "expenses"
  | "quotations"
  | "bills"
  | "products"
  | "stock"
  | "payments"
  | "supplierPayments"
  | "suppliers"
  | "ledger"
  | "journals"
  | "accounts";

export type ListTablePreset = {
  filters: ListFilterField[];
  columns: number;
  rows: number;
  showPagination: boolean;
  showActions: boolean;
  maxWidth?: string;
};

export const LIST_TABLE_PRESETS: Record<ListTablePresetName, ListTablePreset> = {
  invoices: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-48" },
      { kind: "select", width: "w-40" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 7,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  customers: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-40" },
      { kind: "button" },
    ],
    columns: 5,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  expenses: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-52" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 5,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  quotations: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-48" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 6,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  bills: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-48" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 6,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  products: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-40" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 5,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  stock: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-44" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 4,
    rows: 10,
    showPagination: true,
    showActions: false,
  },
  payments: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-48" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 6,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  supplierPayments: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-48" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 5,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  suppliers: {
    filters: [
      { kind: "search" },
      { kind: "select", width: "w-40" },
      { kind: "button" },
    ],
    columns: 4,
    rows: 10,
    showPagination: true,
    showActions: true,
  },
  ledger: {
    filters: [
      { kind: "account" },
      { kind: "period" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 6,
    rows: 12,
    showPagination: false,
    showActions: false,
  },
  journals: {
    filters: [
      { kind: "search" },
      { kind: "period" },
      { kind: "date" },
      { kind: "date" },
      { kind: "button" },
    ],
    columns: 6,
    rows: 12,
    showPagination: false,
    showActions: true,
  },
  accounts: {
    filters: [],
    columns: 4,
    rows: 12,
    showPagination: false,
    showActions: false,
    maxWidth: "max-w-5xl",
  },
};
