import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  CatalogNotFoundError,
  CatalogSkuConflictError,
} from "@/modules/catalog/domain/errors";
import { normalizeProductInput } from "@/modules/catalog/domain/normalize-product";
import type { Product, ProductInput, ProductKind } from "@/modules/catalog/domain/types";
import type { CatalogRepository } from "@/modules/catalog/infrastructure/repositories";

export async function createProduct(input: {
  tenantId: string;
  actorUserId: string;
  fields: ProductInput;
  catalog: CatalogRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<Product> {
  const fields = normalizeProductInput(input.fields);
  const existingSku = await input.catalog.findProductBySku(
    input.tenantId,
    fields.sku
  );
  if (existingSku) {
    throw new CatalogSkuConflictError();
  }

  const product = await input.catalog.createProduct({
    tenantId: input.tenantId,
    fields,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "product.created",
    resource: "product",
    resourceId: product.id,
    metadata: { name: product.name, sku: product.sku },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "ProductCreated",
    aggregateType: "product",
    aggregateId: product.id,
    payload: { name: product.name, sku: product.sku, kind: product.kind },
  });

  return product;
}

export async function updateProduct(input: {
  tenantId: string;
  actorUserId: string;
  productId: string;
  fields: ProductInput;
  catalog: CatalogRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<Product> {
  const fields = normalizeProductInput(input.fields);
  const existing = await input.catalog.findProductById(
    input.tenantId,
    input.productId
  );
  if (!existing) {
    throw new CatalogNotFoundError();
  }

  const skuOwner = await input.catalog.findProductBySku(
    input.tenantId,
    fields.sku
  );
  if (skuOwner && skuOwner.id !== input.productId) {
    throw new CatalogSkuConflictError();
  }

  const product = await input.catalog.updateProduct({
    tenantId: input.tenantId,
    productId: input.productId,
    fields,
  });
  if (!product) {
    throw new CatalogNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "product.updated",
    resource: "product",
    resourceId: product.id,
    metadata: { name: product.name, sku: product.sku },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "ProductUpdated",
    aggregateType: "product",
    aggregateId: product.id,
    payload: { name: product.name, sku: product.sku, kind: product.kind },
  });

  return product;
}

export async function getProduct(input: {
  tenantId: string;
  productId: string;
  catalog: CatalogRepository;
}): Promise<Product> {
  const product = await input.catalog.findProductById(
    input.tenantId,
    input.productId
  );
  if (!product) {
    throw new CatalogNotFoundError();
  }
  return product;
}

export async function listProductsPage(input: {
  tenantId: string;
  query?: string;
  kind?: ProductKind | "ALL";
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  catalog: CatalogRepository;
}) {
  return input.catalog.listProductsPage({
    tenantId: input.tenantId,
    query: input.query,
    kind: input.kind,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listProducts(input: {
  tenantId: string;
  query?: string;
  kind?: ProductKind | "ALL";
  catalog: CatalogRepository;
}): Promise<Product[]> {
  return input.catalog.listProducts({
    tenantId: input.tenantId,
    query: input.query,
    kind: input.kind,
  });
}
