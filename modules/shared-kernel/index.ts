export {
  type Money,
  money,
  moneyFromMajor,
  moneyFromDecimalString,
  moneyFromPrismaDecimal,
  addMoney,
  subtractMoney,
  multiplyMoney,
  negateMoney,
  isZero,
  isPositive,
  isNegative,
  compareMoney,
  toMajorString,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";

export {
  type BusinessDate,
  businessDate,
  isCalendarDate,
  todayInTimezone,
  addBusinessDays,
  yesterdayInTimezone,
  hourInTimezone,
  utcNow,
  financialYearForDate,
} from "@/modules/shared-kernel/dates";

export {
  formatINR,
  formatIndianNumber,
} from "@/modules/shared-kernel/format-money";

export { amountInIndianWords } from "@/modules/shared-kernel/amount-in-words";

export {
  moneyInputSchema,
  businessDateSchema,
  positiveMoneyInputSchema,
} from "@/modules/shared-kernel/schemas";

export {
  listPageParamsSchema,
  PAGE_SIZE_OPTIONS,
  type ListPageParams,
  type ListPageResult,
  type PageSize,
  pageCount,
  clampPage,
  skipForPage,
  toListPageResult,
  paginateArray,
  preserveOrderByIds,
} from "@/modules/shared-kernel/list-page";

export {
  type AuditInput,
  type AuditRecordView,
  type AuditRepository,
  type ListAuditForResourceInput,
  createPrismaAuditRepository,
  createMemoryAuditRepository,
} from "@/modules/shared-kernel/audit";

export {
  type OutboxEventInput,
  type OutboxRepository,
  createPrismaOutboxRepository,
  createMemoryOutboxRepository,
} from "@/modules/shared-kernel/outbox";
