export type FlashToastMessage = {
  title: string;
  description?: string;
  type?: "success" | "info" | "warning" | "error";
};

const ENTITY_SAVED_MESSAGES: Array<{
  prefix: string;
  title: string;
  description?: string;
}> = [
  {
    prefix: "/app/settings",
    title: "Business profile saved",
    description: "Your business settings have been updated.",
  },
  {
    prefix: "/app/sales/customers/",
    title: "Customer saved",
    description: "Customer details have been updated.",
  },
  {
    prefix: "/app/sales/invoices/",
    title: "Invoice updated",
    description: "GST totals were recalculated from the latest business profile.",
  },
  {
    prefix: "/app/sales/quotations/",
    title: "Quotation updated",
    description: "GST totals were recalculated from the latest business profile.",
  },
  {
    prefix: "/app/sales/orders/",
    title: "Sales order updated",
    description: "GST totals were recalculated from the latest business profile.",
  },
  {
    prefix: "/app/sales/credit-notes/",
    title: "Credit note updated",
    description: "GST totals were recalculated from the latest invoice lines.",
  },
  {
    prefix: "/app/purchases/bills/",
    title: "Bill updated",
    description: "GST totals were recalculated from the latest business profile.",
  },
  {
    prefix: "/app/purchases/returns/",
    title: "Return updated",
    description: "GST totals were recalculated from the latest bill lines.",
  },
  {
    prefix: "/app/purchases/suppliers/",
    title: "Supplier saved",
    description: "Supplier details have been updated.",
  },
  {
    prefix: "/app/inventory/products/",
    title: "Product saved",
    description: "Product details have been updated.",
  },
  {
    prefix: "/app/inventory/stock/",
    title: "Stock movement saved",
    description: "Inventory has been updated.",
  },
];

const ENTITY_CREATED_MESSAGES: Array<{
  prefix: string;
  title: string;
  description?: string;
}> = [
  {
    prefix: "/app/sales/invoices/",
    title: "Invoice created",
    description: "Your new invoice is ready to review.",
  },
  {
    prefix: "/app/sales/quotations/",
    title: "Quotation created",
    description: "Your new quotation is ready to review.",
  },
  {
    prefix: "/app/sales/orders/",
    title: "Sales order created",
    description: "Your new sales order is ready to review. Confirming it does not move stock.",
  },
  {
    prefix: "/app/sales/credit-notes/",
    title: "Credit note created",
    description: "Your new credit note is ready to review.",
  },
  {
    prefix: "/app/sales/customers/",
    title: "Customer created",
    description: "You can now use this customer on invoices.",
  },
  {
    prefix: "/app/sales/payments/",
    title: "Payment recorded",
    description: "The payment has been saved.",
  },
  {
    prefix: "/app/purchases/bills/",
    title: "Bill created",
    description: "Your new bill is ready to review.",
  },
  {
    prefix: "/app/purchases/returns/",
    title: "Return created",
    description: "Your new return is ready to review.",
  },
  {
    prefix: "/app/purchases/suppliers/",
    title: "Supplier created",
    description: "You can now use this supplier on bills.",
  },
  {
    prefix: "/app/purchases/payments/",
    title: "Payment recorded",
    description: "The supplier payment has been saved.",
  },
  {
    prefix: "/app/inventory/products/",
    title: "Product created",
    description: "You can now use this product on invoices and bills.",
  },
  {
    prefix: "/app/expenses/",
    title: "Expense recorded",
    description: "The expense has been saved.",
  },
  {
    prefix: "/app/accounting/journals/",
    title: "Journal entry created",
    description: "The journal entry has been saved.",
  },
];

const ENTITY_POSTED_MESSAGES: Array<{
  prefix: string;
  title: string;
  description?: string;
}> = [
  {
    prefix: "/app/sales/invoices/",
    title: "Invoice posted",
    description: "Inventory and accounts have been updated.",
  },
  {
    prefix: "/app/purchases/bills/",
    title: "Bill posted",
    description: "Inventory and accounts have been updated.",
  },
  {
    prefix: "/app/sales/credit-notes/",
    title: "Credit note posted",
    description: "Accounts, GST, and stock have been updated.",
  },
  {
    prefix: "/app/purchases/returns/",
    title: "Return posted",
    description: "Accounts, GST, and stock have been updated.",
  },
  {
    prefix: "/app/sales/quotations/",
    title: "Quotation sent",
    description: "The quotation is now marked as sent.",
  },
];

function matchByPrefix(
  pathname: string,
  entries: Array<{ prefix: string; title: string; description?: string }>
): FlashToastMessage | null {
  const match = entries.find((entry) => pathname.startsWith(entry.prefix));
  if (!match) {
    return null;
  }
  return {
    title: match.title,
    description: match.description,
    type: "success",
  };
}

export function resolveFlashToast(
  pathname: string,
  params: URLSearchParams
): { message: FlashToastMessage; paramKeys: string[] } | null {
  if (params.get("saved") === "autonomy") {
    return {
      message: {
        title: "Autonomy policy saved",
        description: "Your automation preferences have been updated.",
        type: "success",
      },
      paramKeys: ["saved"],
    };
  }

  if (params.get("saved") === "1") {
    const message =
      matchByPrefix(pathname, ENTITY_SAVED_MESSAGES) ?? {
        title: "Changes saved",
        description: "Your updates have been saved.",
        type: "success",
      };
    return { message, paramKeys: ["saved"] };
  }

  const entityCreated = params.get("entityCreated");
  if (
    entityCreated === "customer" ||
    entityCreated === "product" ||
    entityCreated === "supplier"
  ) {
    const labels: Record<typeof entityCreated, FlashToastMessage> = {
      customer: {
        title: "Customer created",
        description: "Continue on this form.",
        type: "success",
      },
      product: {
        title: "Product created",
        description: "Continue on this form.",
        type: "success",
      },
      supplier: {
        title: "Supplier created",
        description: "Continue on this form.",
        type: "success",
      },
    };
    return { message: labels[entityCreated], paramKeys: ["entityCreated"] };
  }

  if (params.get("created") === "1") {
    const message =
      matchByPrefix(pathname, ENTITY_CREATED_MESSAGES) ?? {
        title: "Created successfully",
        description: "Your new record is ready.",
        type: "success",
      };
    return { message, paramKeys: ["created"] };
  }

  if (params.get("invited") === "1") {
    return {
      message: {
        title: "Invitation sent",
        description: "Your teammate will receive an email invitation.",
        type: "success",
      },
      paramKeys: ["invited"],
    };
  }

  if (params.get("closed") === "1") {
    return {
      message: {
        title: "Accounting period closed",
        description: "This period can no longer be edited.",
        type: "success",
      },
      paramKeys: ["closed"],
    };
  }

  if (params.get("posted") === "1") {
    const message =
      matchByPrefix(pathname, ENTITY_POSTED_MESSAGES) ?? {
        title: "Posted successfully",
        description: "The record has been updated.",
        type: "success",
      };
    return { message, paramKeys: ["posted"] };
  }

  if (params.get("cancelled") === "1") {
    return {
      message: {
        title: "Cancelled",
        description: "The draft has been cancelled.",
        type: "success",
      },
      paramKeys: ["cancelled"],
    };
  }

  if (params.get("applied") === "1") {
    return {
      message: {
        title: "Credit applied",
        description: "Invoice outstanding was reduced. Cash was not posted again.",
        type: "success",
      },
      paramKeys: ["applied"],
    };
  }

  if (params.get("accepted") === "1") {
    return {
      message: {
        title: "Quotation accepted",
        description: "The quotation is now marked as accepted.",
        type: "success",
      },
      paramKeys: ["accepted"],
    };
  }

  if (params.get("converted") === "1") {
    return {
      message: {
        title: "Invoice created",
        description: "The quotation was converted to an invoice.",
        type: "success",
      },
      paramKeys: ["converted"],
    };
  }

  return null;
}

export function stripFlashParams(
  params: URLSearchParams,
  paramKeys: string[]
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  for (const key of paramKeys) {
    next.delete(key);
  }
  return next;
}
