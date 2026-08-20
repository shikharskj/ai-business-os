import { z } from "zod";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const listPageParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal("10"), z.literal("20"), z.literal("50")])
    .default("10")
    .transform((value) => Number(value) as PageSize),
});

export type ListPageParams = z.infer<typeof listPageParamsSchema>;

export type ListPageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: PageSize;
};

export function pageCount(total: number, pageSize: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.ceil(total / pageSize);
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const count = pageCount(total, pageSize);
  if (count === 0) {
    return 1;
  }
  return Math.min(Math.max(page, 1), count);
}

export function skipForPage(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function toListPageResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: PageSize
): ListPageResult<T> {
  const clampedPage = clampPage(page, total, pageSize);
  return {
    items,
    total,
    page: clampedPage,
    pageSize,
  };
}

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: PageSize
): ListPageResult<T> {
  const total = items.length;
  const clampedPage = clampPage(page, total, pageSize);
  const skip = skipForPage(clampedPage, pageSize);
  return {
    items: items.slice(skip, skip + pageSize),
    total,
    page: clampedPage,
    pageSize,
  };
}

export function preserveOrderByIds<T>(
  items: T[],
  ids: string[],
  getId: (item: T) => string
): T[] {
  const byId = new Map(items.map((item) => [getId(item), item]));
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is T => item !== undefined);
}
