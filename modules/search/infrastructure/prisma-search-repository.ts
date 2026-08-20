import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

import type { SearchRepository } from "@/modules/search/domain/search-repository";
import { buildPrefixTsQuery } from "@/modules/search/domain/tsquery";
import type {
  SearchEntityType,
  SearchFilter,
  SearchResult,
} from "@/modules/search/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";

type RawHit = {
  id: string;
  entity_type: SearchEntityType;
  title: string;
  subtitle: string | null;
  href: string;
  status: string | null;
  amount_label: string | null;
  party_name: string | null;
  business_date: string | null;
  rank: number;
};

function mapHit(row: RawHit): SearchResult {
  return {
    id: row.id,
    entityType: row.entity_type,
    title: row.title,
    subtitle: row.subtitle,
    href: row.href,
    status: row.status,
    amountLabel: row.amount_label,
    partyName: row.party_name,
    businessDate: row.business_date ? businessDate(row.business_date) : null,
    rank: Number(row.rank),
  };
}

function typesToSearch(filter: SearchFilter): SearchEntityType[] {
  if (filter.types && filter.types.length > 0) {
    return [...filter.types];
  }
  return [
    "customer",
    "supplier",
    "product",
    "invoice",
    "purchase",
    "payment",
    "supplier_payment",
    "expense",
  ];
}

function moneyLabelSql(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`('₹' || trim(to_char(${column}, 'FM999999999990.00')))`;
}

export function createPrismaSearchRepository(
  client: Pick<PrismaClient, "$queryRaw">
): SearchRepository {
  return {
    async search(filter: SearchFilter): Promise<SearchResult[]> {
      const tsQuery = buildPrefixTsQuery(filter.query);
      if (!tsQuery) {
        return [];
      }

      const limit = filter.limit ?? 20;
      const types = typesToSearch(filter);
      const parts: Prisma.Sql[] = [];

      if (types.includes("customer")) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`p."tenantId" = ${filter.tenantId}`,
          Prisma.sql`p.kind = 'CUSTOMER'`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(p.name, '') || ' ' ||
            coalesce(p.gstin, '') || ' ' ||
            coalesce(p.phone, '') || ' ' ||
            coalesce(p.email, '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.status) {
          conditions.push(Prisma.sql`p.status::text = ${filter.status}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            p.id,
            'customer'::text AS entity_type,
            p.name AS title,
            COALESCE(p.gstin, p.phone, p.email) AS subtitle,
            ('/app/sales/customers/' || p.id) AS href,
            p.status::text AS status,
            NULL::text AS amount_label,
            p.name AS party_name,
            NULL::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(p.name, '') || ' ' ||
                coalesce(p.gstin, '') || ' ' ||
                coalesce(p.phone, '') || ' ' ||
                coalesce(p.email, '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM parties p
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (types.includes("supplier")) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`p."tenantId" = ${filter.tenantId}`,
          Prisma.sql`p.kind = 'SUPPLIER'`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(p.name, '') || ' ' ||
            coalesce(p.gstin, '') || ' ' ||
            coalesce(p.phone, '') || ' ' ||
            coalesce(p.email, '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.status) {
          conditions.push(Prisma.sql`p.status::text = ${filter.status}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            p.id,
            'supplier'::text AS entity_type,
            p.name AS title,
            COALESCE(p.gstin, p.phone, p.email) AS subtitle,
            ('/app/purchases/suppliers/' || p.id) AS href,
            p.status::text AS status,
            NULL::text AS amount_label,
            p.name AS party_name,
            NULL::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(p.name, '') || ' ' ||
                coalesce(p.gstin, '') || ' ' ||
                coalesce(p.phone, '') || ' ' ||
                coalesce(p.email, '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM parties p
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (types.includes("product")) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`p."tenantId" = ${filter.tenantId}`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(p.name, '') || ' ' ||
            coalesce(p.sku, '') || ' ' ||
            coalesce(p."hsnSac", '') || ' ' ||
            coalesce(p.category, '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.status) {
          conditions.push(Prisma.sql`p.kind::text = ${filter.status}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            p.id,
            'product'::text AS entity_type,
            p.name AS title,
            p.sku AS subtitle,
            ('/app/inventory/products/' || p.id) AS href,
            p.kind::text AS status,
            NULL::text AS amount_label,
            NULL::text AS party_name,
            NULL::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(p.name, '') || ' ' ||
                coalesce(p.sku, '') || ' ' ||
                coalesce(p."hsnSac", '') || ' ' ||
                coalesce(p.category, '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM products p
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (types.includes("invoice")) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`i."tenantId" = ${filter.tenantId}`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(i.number, '') || ' ' || coalesce(i."customerName", '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.status) {
          conditions.push(Prisma.sql`i.status::text = ${filter.status}`);
        }
        if (filter.fromDate) {
          conditions.push(Prisma.sql`i."issuedOn" >= ${filter.fromDate}`);
        }
        if (filter.toDate) {
          conditions.push(Prisma.sql`i."issuedOn" <= ${filter.toDate}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            i.id,
            'invoice'::text AS entity_type,
            i.number AS title,
            i."customerName" AS subtitle,
            ('/app/sales/invoices/' || i.id) AS href,
            i.status::text AS status,
            ${moneyLabelSql(Prisma.sql`i."grandTotal"`)} AS amount_label,
            i."customerName" AS party_name,
            i."issuedOn"::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(i.number, '') || ' ' || coalesce(i."customerName", '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM sales_invoices i
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (types.includes("purchase")) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`p."tenantId" = ${filter.tenantId}`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(p.number, '') || ' ' || coalesce(p."supplierName", '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.status) {
          conditions.push(Prisma.sql`p.status::text = ${filter.status}`);
        }
        if (filter.fromDate) {
          conditions.push(Prisma.sql`p."issuedOn" >= ${filter.fromDate}`);
        }
        if (filter.toDate) {
          conditions.push(Prisma.sql`p."issuedOn" <= ${filter.toDate}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            p.id,
            'purchase'::text AS entity_type,
            p.number AS title,
            p."supplierName" AS subtitle,
            ('/app/purchases/bills/' || p.id) AS href,
            p.status::text AS status,
            ${moneyLabelSql(Prisma.sql`p."grandTotal"`)} AS amount_label,
            p."supplierName" AS party_name,
            p."issuedOn"::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(p.number, '') || ' ' || coalesce(p."supplierName", '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM purchases p
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (types.includes("payment") && !filter.status) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`cp."tenantId" = ${filter.tenantId}`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(cp.number, '') || ' ' ||
            coalesce(cp."customerName", '') || ' ' ||
            coalesce(cp.reference, '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.fromDate) {
          conditions.push(Prisma.sql`cp."receivedOn" >= ${filter.fromDate}`);
        }
        if (filter.toDate) {
          conditions.push(Prisma.sql`cp."receivedOn" <= ${filter.toDate}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            cp.id,
            'payment'::text AS entity_type,
            cp.number AS title,
            cp."customerName" AS subtitle,
            ('/app/sales/payments/' || cp.id) AS href,
            cp.method::text AS status,
            ${moneyLabelSql(Prisma.sql`cp.amount`)} AS amount_label,
            cp."customerName" AS party_name,
            cp."receivedOn"::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(cp.number, '') || ' ' ||
                coalesce(cp."customerName", '') || ' ' ||
                coalesce(cp.reference, '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM customer_payments cp
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (types.includes("supplier_payment") && !filter.status) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`sp."tenantId" = ${filter.tenantId}`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(sp.number, '') || ' ' ||
            coalesce(sp."supplierName", '') || ' ' ||
            coalesce(sp.reference, '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.fromDate) {
          conditions.push(Prisma.sql`sp."paidOn" >= ${filter.fromDate}`);
        }
        if (filter.toDate) {
          conditions.push(Prisma.sql`sp."paidOn" <= ${filter.toDate}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            sp.id,
            'supplier_payment'::text AS entity_type,
            sp.number AS title,
            sp."supplierName" AS subtitle,
            ('/app/purchases/payments/' || sp.id) AS href,
            sp.method::text AS status,
            ${moneyLabelSql(Prisma.sql`sp.amount`)} AS amount_label,
            sp."supplierName" AS party_name,
            sp."paidOn"::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(sp.number, '') || ' ' ||
                coalesce(sp."supplierName", '') || ' ' ||
                coalesce(sp.reference, '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM supplier_payments sp
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (types.includes("expense")) {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`e."tenantId" = ${filter.tenantId}`,
          Prisma.sql`to_tsvector(
            'simple',
            coalesce(e.number, '') || ' ' ||
            coalesce(e.notes, '') || ' ' ||
            coalesce(e."vendorGstin", '') || ' ' ||
            coalesce(e.category::text, '')
          ) @@ to_tsquery('simple', ${tsQuery})`,
        ];
        if (filter.status) {
          conditions.push(Prisma.sql`e.category::text = ${filter.status}`);
        }
        if (filter.fromDate) {
          conditions.push(Prisma.sql`e."incurredOn" >= ${filter.fromDate}`);
        }
        if (filter.toDate) {
          conditions.push(Prisma.sql`e."incurredOn" <= ${filter.toDate}`);
        }
        parts.push(Prisma.sql`(
          SELECT
            e.id,
            'expense'::text AS entity_type,
            e.number AS title,
            e.category::text AS subtitle,
            ('/app/expenses/' || e.id) AS href,
            e.category::text AS status,
            ${moneyLabelSql(Prisma.sql`e."grandTotal"`)} AS amount_label,
            NULL::text AS party_name,
            e."incurredOn"::text AS business_date,
            ts_rank(
              to_tsvector(
                'simple',
                coalesce(e.number, '') || ' ' ||
                coalesce(e.notes, '') || ' ' ||
                coalesce(e."vendorGstin", '') || ' ' ||
                coalesce(e.category::text, '')
              ),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM expenses e
          WHERE ${Prisma.join(conditions, " AND ")}
          ORDER BY rank DESC, title ASC
          LIMIT ${limit}
        )`);
      }

      if (parts.length === 0) {
        return [];
      }

      const union = Prisma.join(parts, " UNION ALL ");
      const rows = await client.$queryRaw<RawHit[]>(Prisma.sql`
        SELECT * FROM (${union}) AS hits
        ORDER BY rank DESC, title ASC
        LIMIT ${limit}
      `);

      return rows.map(mapHit);
    },
  };
}
