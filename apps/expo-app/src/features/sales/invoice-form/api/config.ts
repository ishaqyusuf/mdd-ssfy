const invoiceFormDataSource =
  process.env.EXPO_PUBLIC_INVOICE_FORM_DATA_SOURCE ||
  process.env.EXPO_PUBLIC_USE_MOCK_INVOICE_FORM ||
  process.env.EXPO_PUBLIC_MOCK_INVOICE_FORM ||
  "mock";

export const USE_MOCK_INVOICE_FORM = !["0", "false", "real", "api"].includes(
  invoiceFormDataSource.trim().toLowerCase(),
);
