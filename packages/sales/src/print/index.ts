export { getPrintData } from "./get-print-data";
export { getPrintDocumentData, resolveSalesCompanyAddress } from "./get-print-document-data";
export { buildCustomerNameLines } from "./compose/customer-name-lines";
export { printSalesV2Schema } from "./schema";
export type { PrintSalesV2Input } from "./schema";

export type {
  PrintMode,
  PrintPage,
  PageMeta,
  AddressBlock,
  PrintModeConfig,
  PrintSection,
  DoorSection,
  MouldingSection,
  ServiceSection,
  ShelfSection,
  LineItemSection,
  SectionDetail,
  CellHeader,
  RowCell,
  DoorRow,
  MouldingRow,
  ServiceRow,
  ShelfRow,
  LineItemRow,
  FooterData,
  FooterLine,
  CompanyAddress,
  SalesTemplateProps,
} from "./types";
