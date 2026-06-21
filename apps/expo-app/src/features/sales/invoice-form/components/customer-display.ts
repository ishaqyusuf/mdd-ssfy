import type { InvoiceCustomer } from "../types";

function clean(value: unknown) {
  return String(value || "").trim();
}

export function getCustomerContactLine(customer?: InvoiceCustomer | null) {
  if (!customer) return "";
  const contact = clean(customer.contact);
  const phone = clean(customer.phone);
  const email = clean(customer.email);
  const parts = [contact, phone || email].filter(Boolean);
  return parts.length ? parts.join(" - ") : clean(customer.name) || "Customer";
}

export function getCustomerAddressLine(customer?: InvoiceCustomer | null) {
  if (!customer) return "";
  return (
    clean(customer.billingAddress) ||
    clean(customer.shippingAddress) ||
    "No address"
  );
}
