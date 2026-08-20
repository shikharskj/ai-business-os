"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authorize } from "@/lib/security";
import {
  isListKey,
  LIST_KEY_PERMISSIONS,
  prismaListOrderRepository,
  type ListKey,
} from "@/modules/list-order";

export type SaveListOrderState = {
  error?: string;
};

const LIST_KEY_PATHS: Record<ListKey, string> = {
  invoices: "/app/sales/invoices",
  quotations: "/app/sales/quotations",
  customers: "/app/sales/customers",
  payments: "/app/sales/payments",
  suppliers: "/app/purchases/suppliers",
  products: "/app/inventory/products",
  stock: "/app/inventory/stock",
  expenses: "/app/expenses",
};

const saveListOrderInputSchema = z.object({
  listKey: z.string().refine(isListKey, "Invalid list key."),
  orderedIds: z.array(z.string().uuid()).min(1).max(100),
  movedId: z.string().uuid(),
  newIndex: z.coerce.number().int().min(0),
  page: z.coerce.number().int().min(1),
  pageSize: z.coerce.number().int().min(1),
}).refine(
  (data) => data.newIndex <= data.orderedIds.length - 1,
  { message: "newIndex must not exceed orderedIds length minus one." }
);

export async function saveListOrder(input: {
  listKey: ListKey;
  orderedIds: string[];
  movedId: string;
  newIndex: number;
  page: number;
  pageSize: number;
}): Promise<SaveListOrderState> {
  try {
    const parsed = saveListOrderInputSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Invalid reorder request." };
    }

    const { listKey, orderedIds, movedId, newIndex, page, pageSize } = parsed.data;
    const tenant = await authorize(LIST_KEY_PERMISSIONS[listKey]);

    await prismaListOrderRepository.savePageOrder({
      tenantId: tenant.tenantId,
      listKey,
      orderedIds,
      movedId,
      newIndex,
      page,
      pageSize,
    });

    const path = LIST_KEY_PATHS[listKey];
    revalidatePath(path);
    return {};
  } catch {
    return { error: "Could not save row order." };
  }
}

export async function saveListOrderAction(
  _prev: SaveListOrderState,
  formData: FormData
): Promise<SaveListOrderState> {
  return saveListOrder({
    listKey: String(formData.get("listKey")) as ListKey,
    orderedIds: formData.getAll("orderedIds").map(String),
    movedId: String(formData.get("movedId")),
    newIndex: Number(formData.get("newIndex")),
    page: Number(formData.get("page")),
    pageSize: Number(formData.get("pageSize")),
  });
}
