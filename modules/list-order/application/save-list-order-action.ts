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

const saveListOrderInputSchema = z.object({
  listKey: z.string().refine(isListKey, "Invalid list key."),
  orderedIds: z.array(z.string().uuid()).min(1),
  movedId: z.string().uuid(),
  newIndex: z.coerce.number().int().min(0),
  path: z.string().min(1),
});

export async function saveListOrder(input: {
  listKey: ListKey;
  orderedIds: string[];
  movedId: string;
  newIndex: number;
  path: string;
}): Promise<SaveListOrderState> {
  try {
    const parsed = saveListOrderInputSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Invalid reorder request." };
    }

    const { listKey, orderedIds, movedId, newIndex, path } = parsed.data;
    const tenant = await authorize(LIST_KEY_PERMISSIONS[listKey]);

    await prismaListOrderRepository.savePageOrder({
      tenantId: tenant.tenantId,
      listKey,
      orderedIds,
      movedId,
      newIndex,
    });

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
    path: String(formData.get("path")),
  });
}
