
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.5.0
 * Query Engine version: 173f8d54f8d52e692c7e27e72a88314ec7aeff60
 */
Prisma.prismaVersion = {
  client: "6.5.0",
  engine: "173f8d54f8d52e692c7e27e72a88314ec7aeff60"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.GitTasksScalarFieldEnum = {
  id: 'id',
  description: 'description',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TodosScalarFieldEnum = {
  id: 'id',
  gitTasksId: 'gitTasksId',
  status: 'status',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GitTaskStatusScalarFieldEnum = {
  id: 'id',
  current: 'current',
  status: 'status',
  description: 'description',
  taskId: 'taskId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GitTaskTagsScalarFieldEnum = {
  id: 'id',
  tagId: 'tagId',
  gitTaskId: 'gitTaskId',
  deletedAt: 'deletedAt'
};

exports.Prisma.TagsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MailGridsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  subject: 'subject',
  html: 'html',
  message: 'message',
  design: 'design',
  fromName: 'fromName',
  fromEmail: 'fromEmail',
  meta: 'meta',
  status: 'status',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  slug: 'slug',
  type: 'type'
};

exports.Prisma.MailEventTriggerScalarFieldEnum = {
  id: 'id',
  when: 'when',
  mailGridId: 'mailGridId',
  authorId: 'authorId',
  status: 'status',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InboxScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  senderId: 'senderId',
  parentId: 'parentId',
  subject: 'subject',
  from: 'from',
  to: 'to',
  type: 'type',
  body: 'body',
  meta: 'meta',
  sentAt: 'sentAt',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InboxAttachmentsScalarFieldEnum = {
  id: 'id',
  url: 'url',
  title: 'title',
  inboxId: 'inboxId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotePadScalarFieldEnum = {
  id: 'id',
  note: 'note',
  color: 'color',
  subject: 'subject',
  headline: 'headline',
  createdById: 'createdById',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  senderContactId: 'senderContactId'
};

exports.Prisma.NoteRecipientsScalarFieldEnum = {
  id: 'id',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  notePadId: 'notePadId',
  notePadContactId: 'notePadContactId'
};

exports.Prisma.NotePadContactsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phoneNo: 'phoneNo',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt'
};

exports.Prisma.NoteTagsScalarFieldEnum = {
  id: 'id',
  tagName: 'tagName',
  tagValue: 'tagValue',
  notePadId: 'notePadId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt'
};

exports.Prisma.NoteCommentsScalarFieldEnum = {
  id: 'id',
  notePadId: 'notePadId',
  commentNotePadId: 'commentNotePadId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt'
};

exports.Prisma.NotePadEventScalarFieldEnum = {
  id: 'id',
  reminderType: 'reminderType',
  status: 'status',
  reminderDate: 'reminderDate',
  remindedAt: 'remindedAt',
  eventDate: 'eventDate',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  notePadId: 'notePadId'
};

exports.Prisma.NotePadReadReceiptScalarFieldEnum = {
  id: 'id',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  notePadContactId: 'notePadContactId',
  notePadId: 'notePadId'
};

exports.Prisma.CustomersScalarFieldEnum = {
  id: 'id',
  addressId: 'addressId',
  customerTypeId: 'customerTypeId',
  slug: 'slug',
  walletId: 'walletId',
  name: 'name',
  businessName: 'businessName',
  email: 'email',
  phoneNo: 'phoneNo',
  phoneNo2: 'phoneNo2',
  address: 'address',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerTaxProfilesScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  taxCode: 'taxCode',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DealerAuthScalarFieldEnum = {
  id: 'id',
  dealerId: 'dealerId',
  createdAt: 'createdAt',
  email: 'email',
  password: 'password',
  emailVerifiedAt: 'emailVerifiedAt',
  approvedAt: 'approvedAt',
  rejectedAt: 'rejectedAt',
  restricted: 'restricted',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  status: 'status',
  primaryBillingAddressId: 'primaryBillingAddressId',
  primaryShippingAddressId: 'primaryShippingAddressId'
};

exports.Prisma.DealerStatusHistoryScalarFieldEnum = {
  id: 'id',
  dealerId: 'dealerId',
  status: 'status',
  authorId: 'authorId',
  reason: 'reason',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DealerTokenScalarFieldEnum = {
  dealerId: 'dealerId',
  token: 'token',
  expiredAt: 'expiredAt',
  consumedAt: 'consumedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CustomerTypesScalarFieldEnum = {
  id: 'id',
  title: 'title',
  coefficient: 'coefficient',
  defaultProfile: 'defaultProfile',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DealerSalesRequestScalarFieldEnum = {
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  salesId: 'salesId',
  request: 'request',
  status: 'status',
  deletedAt: 'deletedAt',
  approvedById: 'approvedById'
};

exports.Prisma.OrderDeliveryScalarFieldEnum = {
  id: 'id',
  salesOrderId: 'salesOrderId',
  deliveredTo: 'deliveredTo',
  deliveryMode: 'deliveryMode',
  driverId: 'driverId',
  createdById: 'createdById',
  status: 'status',
  dueDate: 'dueDate',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.OrderItemDeliveryScalarFieldEnum = {
  id: 'id',
  orderItemId: 'orderItemId',
  orderId: 'orderId',
  lhQty: 'lhQty',
  rhQty: 'rhQty',
  qty: 'qty',
  meta: 'meta',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  orderDeliveryId: 'orderDeliveryId',
  orderProductionSubmissionId: 'orderProductionSubmissionId'
};

exports.Prisma.SalesPickupScalarFieldEnum = {
  id: 'id',
  pickupBy: 'pickupBy',
  pickupApprovedBy: 'pickupApprovedBy',
  meta: 'meta',
  pickupAt: 'pickupAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CommissionPaymentScalarFieldEnum = {
  id: 'id',
  amount: 'amount',
  userId: 'userId',
  paidBy: 'paidBy',
  checkNo: 'checkNo',
  paymentMethod: 'paymentMethod',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  usersId: 'usersId'
};

exports.Prisma.SalesTakeOffScalarFieldEnum = {
  id: 'id',
  salesId: 'salesId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesTakeOffSectionScalarFieldEnum = {
  id: 'id',
  title: 'title',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  salesTakeOffId: 'salesTakeOffId'
};

exports.Prisma.SalesTakeOffComponentScalarFieldEnum = {
  id: 'id',
  itemUid: 'itemUid',
  lhQty: 'lhQty',
  rhQty: 'rhQty',
  totalQty: 'totalQty',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  salesTakeOffSectionId: 'salesTakeOffSectionId'
};

exports.Prisma.SalesOrdersScalarFieldEnum = {
  id: 'id',
  title: 'title',
  customerId: 'customerId',
  billingAddressId: 'billingAddressId',
  shippingAddressId: 'shippingAddressId',
  salesRepId: 'salesRepId',
  pickupId: 'pickupId',
  prodId: 'prodId',
  isDyke: 'isDyke',
  summary: 'summary',
  instruction: 'instruction',
  meta: 'meta',
  status: 'status',
  inventoryStatus: 'inventoryStatus',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  orderId: 'orderId',
  slug: 'slug',
  type: 'type',
  goodUntil: 'goodUntil',
  paymentTerm: 'paymentTerm',
  prodQty: 'prodQty',
  builtQty: 'builtQty',
  subTotal: 'subTotal',
  profitMargin: 'profitMargin',
  tax: 'tax',
  taxPercentage: 'taxPercentage',
  grandTotal: 'grandTotal',
  amountDue: 'amountDue',
  invoiceStatus: 'invoiceStatus',
  prodStatus: 'prodStatus',
  prodDueDate: 'prodDueDate',
  paymentDueDate: 'paymentDueDate',
  deliveredAt: 'deliveredAt',
  deliveryOption: 'deliveryOption',
  customerProfileId: 'customerProfileId'
};

exports.Prisma.SalesExtraCostsScalarFieldEnum = {
  id: 'id',
  type: 'type',
  taxxable: 'taxxable',
  amount: 'amount',
  tax: 'tax',
  totalAmount: 'totalAmount',
  orderId: 'orderId'
};

exports.Prisma.SalesOrderItemsScalarFieldEnum = {
  id: 'id',
  description: 'description',
  dykeDescription: 'dykeDescription',
  productId: 'productId',
  supplier: 'supplier',
  swing: 'swing',
  price: 'price',
  tax: 'tax',
  taxPercenatage: 'taxPercenatage',
  discount: 'discount',
  discountPercentage: 'discountPercentage',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  qty: 'qty',
  prebuiltQty: 'prebuiltQty',
  truckLoadQty: 'truckLoadQty',
  salesOrderId: 'salesOrderId',
  profitMargin: 'profitMargin',
  rate: 'rate',
  total: 'total',
  salesPercentage: 'salesPercentage',
  prodStatus: 'prodStatus',
  prodStartedAt: 'prodStartedAt',
  sentToProdAt: 'sentToProdAt',
  prodCompletedAt: 'prodCompletedAt',
  multiDyke: 'multiDyke',
  dykeProduction: 'dykeProduction',
  multiDykeUid: 'multiDykeUid'
};

exports.Prisma.QtyControlScalarFieldEnum = {
  itemControlUid: 'itemControlUid',
  qty: 'qty',
  lh: 'lh',
  rh: 'rh',
  total: 'total',
  itemTotal: 'itemTotal',
  type: 'type',
  percentage: 'percentage',
  autoComplete: 'autoComplete',
  deletedAt: 'deletedAt'
};

exports.Prisma.SalesItemControlScalarFieldEnum = {
  uid: 'uid',
  title: 'title',
  subtitle: 'subtitle',
  sectionTitle: 'sectionTitle',
  salesId: 'salesId',
  produceable: 'produceable',
  shippable: 'shippable',
  deletedAt: 'deletedAt',
  orderItemId: 'orderItemId'
};

exports.Prisma.HousePackageToolsScalarFieldEnum = {
  id: 'id',
  orderItemId: 'orderItemId',
  priceId: 'priceId',
  height: 'height',
  doorType: 'doorType',
  doorId: 'doorId',
  dykeDoorId: 'dykeDoorId',
  jambSizeId: 'jambSizeId',
  casingId: 'casingId',
  moldingId: 'moldingId',
  stepProductId: 'stepProductId',
  totalPrice: 'totalPrice',
  totalDoors: 'totalDoors',
  meta: 'meta',
  salesOrderId: 'salesOrderId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ComponentPriceScalarFieldEnum = {
  id: 'id',
  salesItemId: 'salesItemId',
  salesId: 'salesId',
  qty: 'qty',
  type: 'type',
  baseUnitCost: 'baseUnitCost',
  baseTotalCost: 'baseTotalCost',
  salesUnitCost: 'salesUnitCost',
  salesTotalCost: 'salesTotalCost',
  margin: 'margin',
  salesProfit: 'salesProfit',
  taxPercentage: 'taxPercentage',
  totalTax: 'totalTax',
  grandTotal: 'grandTotal',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeSalesDoorsScalarFieldEnum = {
  id: 'id',
  priceId: 'priceId',
  dimension: 'dimension',
  swing: 'swing',
  doorType: 'doorType',
  housePackageToolId: 'housePackageToolId',
  doorPrice: 'doorPrice',
  jambSizePrice: 'jambSizePrice',
  casingPrice: 'casingPrice',
  unitPrice: 'unitPrice',
  lhQty: 'lhQty',
  rhQty: 'rhQty',
  totalQty: 'totalQty',
  salesOrderId: 'salesOrderId',
  lineTotal: 'lineTotal',
  salesOrderItemId: 'salesOrderItemId',
  stepProductId: 'stepProductId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeStepFormScalarFieldEnum = {
  id: 'id',
  componentId: 'componentId',
  value: 'value',
  priceId: 'priceId',
  qty: 'qty',
  price: 'price',
  basePrice: 'basePrice',
  prodUid: 'prodUid',
  salesId: 'salesId',
  salesItemId: 'salesItemId',
  stepId: 'stepId',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DykeStepsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  uid: 'uid',
  value: 'value',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  stepValueId: 'stepValueId',
  rootStepValueId: 'rootStepValueId',
  prevStepValueId: 'prevStepValueId',
  meta: 'meta',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeStepValuesScalarFieldEnum = {
  id: 'id',
  title: 'title',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeCategoriesScalarFieldEnum = {
  id: 'id',
  title: 'title',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeStepProductsScalarFieldEnum = {
  id: 'id',
  uid: 'uid',
  productCode: 'productCode',
  name: 'name',
  img: 'img',
  redirectUid: 'redirectUid',
  custom: 'custom',
  sortIndex: 'sortIndex',
  dykeProductId: 'dykeProductId',
  doorId: 'doorId',
  dykeStepId: 'dykeStepId',
  nextStepId: 'nextStepId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductSortIndexScalarFieldEnum = {
  id: 'id',
  sortIndex: 'sortIndex',
  uid: 'uid',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  stepComponentId: 'stepComponentId'
};

exports.Prisma.DykePricingSystemScalarFieldEnum = {
  id: 'id',
  dykeStepId: 'dykeStepId',
  dependenciesUid: 'dependenciesUid',
  stepProductUid: 'stepProductUid',
  price: 'price',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeDoorsScalarFieldEnum = {
  id: 'id',
  query: 'query',
  doorType: 'doorType',
  title: 'title',
  img: 'img',
  price: 'price',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeProductsScalarFieldEnum = {
  id: 'id',
  img: 'img',
  description: 'description',
  noteRequired: 'noteRequired',
  custom: 'custom',
  title: 'title',
  price: 'price',
  categoryId: 'categoryId',
  productCode: 'productCode',
  qty: 'qty',
  meta: 'meta',
  value: 'value',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeProductPricesScalarFieldEnum = {
  id: 'id',
  price: 'price',
  dimension: 'dimension',
  type: 'type',
  productId: 'productId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeShelfCategoriesScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  categoryId: 'categoryId',
  parentCategoryId: 'parentCategoryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeShelfProductsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  unitPrice: 'unitPrice',
  categoryId: 'categoryId',
  parentCategoryId: 'parentCategoryId',
  img: 'img',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DykeSalesErrorScalarFieldEnum = {
  id: 'id',
  errorId: 'errorId',
  userId: 'userId',
  restoredAt: 'restoredAt',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesTaxesScalarFieldEnum = {
  id: 'id',
  salesId: 'salesId',
  taxCode: 'taxCode',
  taxxable: 'taxxable',
  tax: 'tax',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.TaxesScalarFieldEnum = {
  title: 'title',
  taxCode: 'taxCode',
  percentage: 'percentage',
  taxOn: 'taxOn',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SalesStatScalarFieldEnum = {
  salesId: 'salesId',
  status: 'status',
  type: 'type',
  score: 'score',
  total: 'total',
  percentage: 'percentage',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.OrderItemProductionAssignmentsScalarFieldEnum = {
  id: 'id',
  itemId: 'itemId',
  orderId: 'orderId',
  assignedToId: 'assignedToId',
  assignedById: 'assignedById',
  qtyAssigned: 'qtyAssigned',
  qtyCompleted: 'qtyCompleted',
  lhQty: 'lhQty',
  rhQty: 'rhQty',
  note: 'note',
  salesDoorId: 'salesDoorId',
  startedAt: 'startedAt',
  dueDate: 'dueDate',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  salesItemControlUid: 'salesItemControlUid',
  shelfItemId: 'shelfItemId'
};

exports.Prisma.OrderProductionSubmissionsScalarFieldEnum = {
  id: 'id',
  salesOrderId: 'salesOrderId',
  salesOrderItemId: 'salesOrderItemId',
  qty: 'qty',
  lhQty: 'lhQty',
  rhQty: 'rhQty',
  note: 'note',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  assignmentId: 'assignmentId',
  meta: 'meta'
};

exports.Prisma.DykeSalesShelfItemScalarFieldEnum = {
  id: 'id',
  salesOrderItemId: 'salesOrderItemId',
  description: 'description',
  productId: 'productId',
  categoryId: 'categoryId',
  qty: 'qty',
  unitPrice: 'unitPrice',
  totalPrice: 'totalPrice',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SalesCommisionScalarFieldEnum = {
  id: 'id',
  amount: 'amount',
  userId: 'userId',
  orderId: 'orderId',
  orderPaymentId: 'orderPaymentId',
  commissionPaymentId: 'commissionPaymentId',
  status: 'status',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesOrderProductsScalarFieldEnum = {
  id: 'id',
  salesOrderId: 'salesOrderId',
  salesOrderItemId: 'salesOrderItemId',
  qty: 'qty',
  stockQty: 'stockQty',
  shortQty: 'shortQty',
  productVariantId: 'productVariantId',
  productId: 'productId',
  status: 'status',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefundsScalarFieldEnum = {
  id: 'id',
  refId: 'refId',
  salesId: 'salesId',
  refundSalesId: 'refundSalesId',
  walletId: 'walletId',
  total: 'total',
  status: 'status',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RefundTransactionsScalarFieldEnum = {
  id: 'id',
  refundId: 'refundId',
  transactionId: 'transactionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CustomerTransactionScalarFieldEnum = {
  id: 'id',
  authorId: 'authorId',
  txId: 'txId',
  status: 'status',
  amount: 'amount',
  walletId: 'walletId',
  paymentMethod: 'paymentMethod',
  type: 'type',
  description: 'description',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  squarePID: 'squarePID'
};

exports.Prisma.CustomerWalletScalarFieldEnum = {
  id: 'id',
  balance: 'balance',
  accountNo: 'accountNo',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SalesPaymentsScalarFieldEnum = {
  id: 'id',
  note: 'note',
  authorId: 'authorId',
  squarePaymentsId: 'squarePaymentsId',
  transactionId: 'transactionId',
  orderId: 'orderId',
  amount: 'amount',
  tip: 'tip',
  meta: 'meta',
  status: 'status',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SquarePaymentsScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  status: 'status',
  squareOrderId: 'squareOrderId',
  paymentMethod: 'paymentMethod',
  paymentLink: 'paymentLink',
  terminalId: 'terminalId',
  amount: 'amount',
  tip: 'tip',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.SquarePaymentOrdersScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  squarePaymentId: 'squarePaymentId'
};

exports.Prisma.PaymentTerminalsScalarFieldEnum = {
  terminalId: 'terminalId',
  terminalName: 'terminalName',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesCheckoutScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  userId: 'userId',
  status: 'status',
  paymentType: 'paymentType',
  terminalId: 'terminalId',
  terminalName: 'terminalName',
  amount: 'amount',
  tip: 'tip',
  orderId: 'orderId',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  salesPaymentsId: 'salesPaymentsId',
  squarePaymentId: 'squarePaymentId'
};

exports.Prisma.CheckoutTendersScalarFieldEnum = {
  id: 'id',
  tenderId: 'tenderId',
  salesCheckoutId: 'salesCheckoutId',
  status: 'status',
  amount: 'amount',
  tip: 'tip',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt'
};

exports.Prisma.AutoCompletesScalarFieldEnum = {
  id: 'id',
  type: 'type',
  fieldName: 'fieldName',
  deletedAt: 'deletedAt',
  value: 'value'
};

exports.Prisma.AddressBooksScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  name: 'name',
  address1: 'address1',
  address2: 'address2',
  country: 'country',
  state: 'state',
  city: 'city',
  email: 'email',
  phoneNo: 'phoneNo',
  phoneNo2: 'phoneNo2',
  isPrimary: 'isPrimary',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ErrorLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  data: 'data',
  meta: 'meta',
  status: 'status',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ErrorLogTagsScalarFieldEnum = {
  id: 'id',
  errorLogId: 'errorLogId',
  errorTagId: 'errorTagId',
  deletedAt: 'deletedAt'
};

exports.Prisma.ErrorTagsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  deletedAt: 'deletedAt'
};

exports.Prisma.BuildersScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CostChartsScalarFieldEnum = {
  id: 'id',
  parentId: 'parentId',
  current: 'current',
  title: 'title',
  type: 'type',
  model: 'model',
  meta: 'meta',
  startDate: 'startDate',
  endDate: 'endDate',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommunityModelsScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  pivotId: 'pivotId',
  modelName: 'modelName',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  slug: 'slug'
};

exports.Prisma.CommunityTemplateHistoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  communityModelsId: 'communityModelsId'
};

exports.Prisma.PageViewScalarFieldEnum = {
  id: 'id',
  url: 'url',
  group: 'group',
  searchParams: 'searchParams',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt',
  userId: 'userId'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  type: 'type',
  data: 'data',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt',
  value: 'value',
  userId: 'userId'
};

exports.Prisma.CommunityModelPivotScalarFieldEnum = {
  id: 'id',
  model: 'model',
  projectId: 'projectId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CommunityModelCostScalarFieldEnum = {
  id: 'id',
  communityModelId: 'communityModelId',
  pivotId: 'pivotId',
  current: 'current',
  title: 'title',
  type: 'type',
  model: 'model',
  meta: 'meta',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HomesScalarFieldEnum = {
  id: 'id',
  archived: 'archived',
  projectId: 'projectId',
  builderId: 'builderId',
  homeTemplateId: 'homeTemplateId',
  communityTemplateId: 'communityTemplateId',
  homeKey: 'homeKey',
  slug: 'slug',
  modelName: 'modelName',
  modelNo: 'modelNo',
  lotBlock: 'lotBlock',
  lot: 'lot',
  block: 'block',
  status: 'status',
  address: 'address',
  meta: 'meta',
  sentToProdAt: 'sentToProdAt',
  installedAt: 'installedAt',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  search: 'search',
  punchoutAt: 'punchoutAt',
  installCost: 'installCost',
  punchoutCost: 'punchoutCost'
};

exports.Prisma.HomeTasksScalarFieldEnum = {
  id: 'id',
  archived: 'archived',
  homeId: 'homeId',
  type: 'type',
  taskName: 'taskName',
  taskUid: 'taskUid',
  status: 'status',
  meta: 'meta',
  producerName: 'producerName',
  search: 'search',
  productionStatus: 'productionStatus',
  checkNo: 'checkNo',
  projectId: 'projectId',
  assignedToId: 'assignedToId',
  billable: 'billable',
  produceable: 'produceable',
  installable: 'installable',
  punchout: 'punchout',
  deco: 'deco',
  addon: 'addon',
  taxCost: 'taxCost',
  amountDue: 'amountDue',
  amountPaid: 'amountPaid',
  completedAt: 'completedAt',
  jobId: 'jobId',
  checkDate: 'checkDate',
  statusDate: 'statusDate',
  sentToProductionAt: 'sentToProductionAt',
  producedAt: 'producedAt',
  prodStartedAt: 'prodStartedAt',
  productionStatusDate: 'productionStatusDate',
  productionDueDate: 'productionDueDate',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HomeTemplatesScalarFieldEnum = {
  id: 'id',
  builderId: 'builderId',
  slug: 'slug',
  modelNo: 'modelNo',
  modelName: 'modelName',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesItemSupplyScalarFieldEnum = {
  id: 'id',
  salesOrderItemId: 'salesOrderItemId',
  salesOrderId: 'salesOrderId',
  qty: 'qty',
  productId: 'productId',
  meta: 'meta',
  status: 'status',
  location: 'location',
  supplier: 'supplier',
  putAwayBy: 'putAwayBy',
  putawayAt: 'putawayAt',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  unitCost: 'unitCost',
  totalCost: 'totalCost'
};

exports.Prisma.InventoriesScalarFieldEnum = {
  id: 'id',
  qty: 'qty',
  productId: 'productId',
  productVariantId: 'productVariantId',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderInventoryScalarFieldEnum = {
  id: 'id',
  category: 'category',
  meta: 'meta',
  name: 'name',
  description: 'description',
  price: 'price',
  parentId: 'parentId',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt',
  updatedAt: 'updatedAt',
  orderInventoryId: 'orderInventoryId'
};

exports.Prisma.InventoryProductsScalarFieldEnum = {
  id: 'id',
  multiVariant: 'multiVariant',
  title: 'title',
  description: 'description',
  categoryId: 'categoryId',
  subCategoryId: 'subCategoryId',
  weight: 'weight',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priceUpdateAt: 'priceUpdateAt',
  type: 'type',
  slug: 'slug',
  sku: 'sku',
  barcode: 'barcode',
  qty: 'qty',
  price: 'price',
  minimumStockLevel: 'minimumStockLevel',
  img: 'img',
  status: 'status',
  category: 'category',
  subCategory: 'subCategory',
  supplier: 'supplier'
};

exports.Prisma.InvoicesScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  homeId: 'homeId',
  refNo: 'refNo',
  lot: 'lot',
  block: 'block',
  taskId: 'taskId',
  checkNo: 'checkNo',
  amount: 'amount',
  taskName: 'taskName',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  taskUid: 'taskUid',
  checkDate: 'checkDate'
};

exports.Prisma.MigrationsScalarFieldEnum = {
  id: 'id',
  migration: 'migration',
  batch: 'batch'
};

exports.Prisma.ModelHasPermissionsScalarFieldEnum = {
  permissionId: 'permissionId',
  modelType: 'modelType',
  modelId: 'modelId',
  deletedAt: 'deletedAt'
};

exports.Prisma.ModelHasRolesScalarFieldEnum = {
  roleId: 'roleId',
  modelType: 'modelType',
  modelId: 'modelId',
  deletedAt: 'deletedAt'
};

exports.Prisma.PasswordResetsScalarFieldEnum = {
  id: 'id',
  email: 'email',
  token: 'token',
  usedAt: 'usedAt',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt'
};

exports.Prisma.PermissionsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PostsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  type: 'type',
  content: 'content',
  meta: 'meta',
  status: 'status',
  parentId: 'parentId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SettingsScalarFieldEnum = {
  id: 'id',
  type: 'type',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductCategoriesScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  categoryId: 'categoryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductsScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  section: 'section',
  name: 'name',
  description: 'description',
  size: 'size',
  type: 'type',
  box: 'box',
  price: 'price',
  finish: 'finish',
  length: 'length',
  per: 'per',
  unitQty: 'unitQty',
  itemNumber: 'itemNumber',
  lastUpdate: 'lastUpdate',
  note: 'note',
  priceType: 'priceType',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductVariantsScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  weight: 'weight',
  price: 'price',
  description: 'description',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  slug: 'slug',
  title: 'title',
  variantTitle: 'variantTitle',
  sku: 'sku',
  barcode: 'barcode',
  qty: 'qty',
  minimumStockLevel: 'minimumStockLevel',
  img: 'img',
  status: 'status',
  category: 'category',
  subCategory: 'subCategory',
  supplier: 'supplier'
};

exports.Prisma.ProgressScalarFieldEnum = {
  id: 'id',
  parentId: 'parentId',
  progressableId: 'progressableId',
  progressableType: 'progressableType',
  userId: 'userId',
  status: 'status',
  type: 'type',
  headline: 'headline',
  description: 'description',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProjectsScalarFieldEnum = {
  id: 'id',
  archived: 'archived',
  title: 'title',
  builderId: 'builderId',
  address: 'address',
  slug: 'slug',
  meta: 'meta',
  refNo: 'refNo',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleHasPermissionsScalarFieldEnum = {
  permissionId: 'permissionId',
  roleId: 'roleId',
  deletedAt: 'deletedAt'
};

exports.Prisma.RolesScalarFieldEnum = {
  id: 'id',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SalesInvoiceItemsScalarFieldEnum = {
  id: 'id',
  uid: 'uid',
  productId: 'productId',
  salesInvoiceId: 'salesInvoiceId',
  item: 'item',
  description: 'description',
  qty: 'qty',
  salesPercentage: 'salesPercentage',
  costPrice: 'costPrice',
  salesPrice: 'salesPrice',
  total: 'total',
  tax: 'tax',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesInvoicesScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  invoiceNumber: 'invoiceNumber',
  customerName: 'customerName',
  sumTax: 'sumTax',
  subTotal: 'subTotal',
  total: 'total',
  salesPercentage: 'salesPercentage',
  taxPercentage: 'taxPercentage',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesJobsScalarFieldEnum = {
  id: 'id',
  jobId: 'jobId',
  salesOrderId: 'salesOrderId',
  meta: 'meta',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.JobsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  coWorkerId: 'coWorkerId',
  type: 'type',
  homeId: 'homeId',
  projectId: 'projectId',
  amount: 'amount',
  title: 'title',
  subtitle: 'subtitle',
  description: 'description',
  note: 'note',
  status: 'status',
  meta: 'meta',
  adminNote: 'adminNote',
  statusDate: 'statusDate',
  rejectedAt: 'rejectedAt',
  approvedAt: 'approvedAt',
  approvedBy: 'approvedBy',
  paymentId: 'paymentId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JobPaymentsScalarFieldEnum = {
  id: 'id',
  amount: 'amount',
  charges: 'charges',
  subTotal: 'subTotal',
  userId: 'userId',
  paidBy: 'paidBy',
  checkNo: 'checkNo',
  paymentMethod: 'paymentMethod',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkOrdersScalarFieldEnum = {
  id: 'id',
  techId: 'techId',
  slug: 'slug',
  description: 'description',
  lot: 'lot',
  block: 'block',
  projectName: 'projectName',
  builderName: 'builderName',
  requestDate: 'requestDate',
  supervisor: 'supervisor',
  scheduleDate: 'scheduleDate',
  scheduleTime: 'scheduleTime',
  homeAddress: 'homeAddress',
  homeOwner: 'homeOwner',
  homePhone: 'homePhone',
  meta: 'meta',
  status: 'status',
  assignedAt: 'assignedAt',
  completedAt: 'completedAt',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationsScalarFieldEnum = {
  id: 'id',
  meta: 'meta',
  type: 'type',
  fromUserId: 'fromUserId',
  userId: 'userId',
  message: 'message',
  alert: 'alert',
  deliveredAt: 'deliveredAt',
  link: 'link',
  seenAt: 'seenAt',
  archivedAt: 'archivedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CacheScalarFieldEnum = {
  id: 'id',
  path: 'path',
  name: 'name',
  group: 'group',
  meta: 'meta',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.BlogsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  authorId: 'authorId',
  type: 'type',
  content: 'content',
  meta: 'meta',
  status: 'status',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.GalleryScalarFieldEnum = {
  id: 'id',
  description: 'description',
  src: 'src',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.GalleryTagScalarFieldEnum = {
  id: 'id',
  galleryId: 'galleryId',
  tagId: 'tagId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.GalleryTagNameScalarFieldEnum = {
  id: 'id',
  title: 'title',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SiteActionTicketScalarFieldEnum = {
  id: 'id',
  description: 'description',
  type: 'type',
  event: 'event',
  userId: 'userId',
  siteActionNotificationId: 'siteActionNotificationId',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SiteActionNotificationScalarFieldEnum = {
  id: 'id',
  event: 'event',
  enabled: 'enabled',
  custom: 'custom',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SiteActionNotificationActiveForUsersScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  siteActionNotificationId: 'siteActionNotificationId',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UsersScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  username: 'username',
  email: 'email',
  phoneNo: 'phoneNo',
  phoneCode: 'phoneCode',
  country: 'country',
  emailVerifiedAt: 'emailVerifiedAt',
  password: 'password',
  rememberToken: 'rememberToken',
  meta: 'meta',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  employeeProfileId: 'employeeProfileId'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmployeeProfileScalarFieldEnum = {
  id: 'id',
  name: 'name',
  discount: 'discount',
  meta: 'meta',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserDocumentsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  url: 'url',
  userId: 'userId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ExportConfigScalarFieldEnum = {
  id: 'id',
  title: 'title',
  type: 'type',
  meta: 'meta',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PageTabsScalarFieldEnum = {
  id: 'id',
  page: 'page',
  userId: 'userId',
  private: 'private',
  title: 'title',
  query: 'query',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PageTabIndexScalarFieldEnum = {
  id: 'id',
  tabId: 'tabId',
  tabIndex: 'tabIndex',
  userId: 'userId',
  default: 'default',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SearchParametersScalarFieldEnum = {
  page: 'page',
  key: 'key',
  value: 'value',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.GitTasksOrderByRelevanceFieldEnum = {
  description: 'description'
};

exports.Prisma.TodosOrderByRelevanceFieldEnum = {
  status: 'status'
};

exports.Prisma.GitTaskStatusOrderByRelevanceFieldEnum = {
  status: 'status',
  description: 'description'
};

exports.Prisma.TagsOrderByRelevanceFieldEnum = {
  title: 'title'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.MailGridsOrderByRelevanceFieldEnum = {
  title: 'title',
  subject: 'subject',
  html: 'html',
  message: 'message',
  design: 'design',
  fromName: 'fromName',
  fromEmail: 'fromEmail',
  status: 'status',
  slug: 'slug',
  type: 'type'
};

exports.Prisma.MailEventTriggerOrderByRelevanceFieldEnum = {
  when: 'when',
  status: 'status'
};

exports.Prisma.InboxOrderByRelevanceFieldEnum = {
  subject: 'subject',
  from: 'from',
  to: 'to',
  type: 'type',
  body: 'body'
};

exports.Prisma.InboxAttachmentsOrderByRelevanceFieldEnum = {
  url: 'url',
  title: 'title'
};

exports.Prisma.NotePadOrderByRelevanceFieldEnum = {
  note: 'note',
  color: 'color',
  subject: 'subject',
  headline: 'headline'
};

exports.Prisma.NotePadContactsOrderByRelevanceFieldEnum = {
  name: 'name',
  email: 'email',
  phoneNo: 'phoneNo'
};

exports.Prisma.NoteTagsOrderByRelevanceFieldEnum = {
  tagName: 'tagName',
  tagValue: 'tagValue'
};

exports.Prisma.NotePadEventOrderByRelevanceFieldEnum = {
  reminderType: 'reminderType',
  status: 'status'
};

exports.Prisma.CustomersOrderByRelevanceFieldEnum = {
  slug: 'slug',
  name: 'name',
  businessName: 'businessName',
  email: 'email',
  phoneNo: 'phoneNo',
  phoneNo2: 'phoneNo2',
  address: 'address'
};

exports.Prisma.CustomerTaxProfilesOrderByRelevanceFieldEnum = {
  taxCode: 'taxCode'
};

exports.Prisma.DealerAuthOrderByRelevanceFieldEnum = {
  email: 'email',
  password: 'password',
  status: 'status'
};

exports.Prisma.DealerStatusHistoryOrderByRelevanceFieldEnum = {
  status: 'status',
  reason: 'reason'
};

exports.Prisma.DealerTokenOrderByRelevanceFieldEnum = {
  token: 'token'
};

exports.Prisma.CustomerTypesOrderByRelevanceFieldEnum = {
  title: 'title'
};

exports.Prisma.DealerSalesRequestOrderByRelevanceFieldEnum = {
  request: 'request',
  status: 'status'
};

exports.Prisma.OrderDeliveryOrderByRelevanceFieldEnum = {
  deliveredTo: 'deliveredTo',
  deliveryMode: 'deliveryMode',
  status: 'status'
};

exports.Prisma.OrderItemDeliveryOrderByRelevanceFieldEnum = {
  status: 'status'
};

exports.Prisma.SalesPickupOrderByRelevanceFieldEnum = {
  pickupBy: 'pickupBy'
};

exports.Prisma.CommissionPaymentOrderByRelevanceFieldEnum = {
  checkNo: 'checkNo',
  paymentMethod: 'paymentMethod'
};

exports.Prisma.SalesTakeOffSectionOrderByRelevanceFieldEnum = {
  title: 'title'
};

exports.Prisma.SalesTakeOffComponentOrderByRelevanceFieldEnum = {
  itemUid: 'itemUid'
};

exports.Prisma.SalesOrdersOrderByRelevanceFieldEnum = {
  title: 'title',
  summary: 'summary',
  instruction: 'instruction',
  status: 'status',
  inventoryStatus: 'inventoryStatus',
  orderId: 'orderId',
  slug: 'slug',
  type: 'type',
  paymentTerm: 'paymentTerm',
  invoiceStatus: 'invoiceStatus',
  prodStatus: 'prodStatus',
  deliveryOption: 'deliveryOption'
};

exports.Prisma.SalesExtraCostsOrderByRelevanceFieldEnum = {
  type: 'type'
};

exports.Prisma.SalesOrderItemsOrderByRelevanceFieldEnum = {
  description: 'description',
  dykeDescription: 'dykeDescription',
  supplier: 'supplier',
  swing: 'swing',
  prodStatus: 'prodStatus',
  multiDykeUid: 'multiDykeUid'
};

exports.Prisma.QtyControlOrderByRelevanceFieldEnum = {
  itemControlUid: 'itemControlUid',
  type: 'type'
};

exports.Prisma.SalesItemControlOrderByRelevanceFieldEnum = {
  uid: 'uid',
  title: 'title',
  subtitle: 'subtitle',
  sectionTitle: 'sectionTitle'
};

exports.Prisma.HousePackageToolsOrderByRelevanceFieldEnum = {
  priceId: 'priceId',
  height: 'height',
  doorType: 'doorType'
};

exports.Prisma.ComponentPriceOrderByRelevanceFieldEnum = {
  id: 'id',
  type: 'type'
};

exports.Prisma.DykeSalesDoorsOrderByRelevanceFieldEnum = {
  priceId: 'priceId',
  dimension: 'dimension',
  swing: 'swing',
  doorType: 'doorType'
};

exports.Prisma.DykeStepFormOrderByRelevanceFieldEnum = {
  value: 'value',
  priceId: 'priceId',
  prodUid: 'prodUid'
};

exports.Prisma.DykeStepsOrderByRelevanceFieldEnum = {
  title: 'title',
  uid: 'uid',
  value: 'value'
};

exports.Prisma.DykeStepValuesOrderByRelevanceFieldEnum = {
  title: 'title'
};

exports.Prisma.DykeCategoriesOrderByRelevanceFieldEnum = {
  title: 'title'
};

exports.Prisma.DykeStepProductsOrderByRelevanceFieldEnum = {
  uid: 'uid',
  productCode: 'productCode',
  name: 'name',
  img: 'img',
  redirectUid: 'redirectUid'
};

exports.Prisma.ProductSortIndexOrderByRelevanceFieldEnum = {
  uid: 'uid'
};

exports.Prisma.DykePricingSystemOrderByRelevanceFieldEnum = {
  dependenciesUid: 'dependenciesUid',
  stepProductUid: 'stepProductUid'
};

exports.Prisma.DykeDoorsOrderByRelevanceFieldEnum = {
  query: 'query',
  doorType: 'doorType',
  title: 'title',
  img: 'img'
};

exports.Prisma.DykeProductsOrderByRelevanceFieldEnum = {
  img: 'img',
  description: 'description',
  title: 'title',
  productCode: 'productCode',
  value: 'value'
};

exports.Prisma.DykeProductPricesOrderByRelevanceFieldEnum = {
  dimension: 'dimension',
  type: 'type'
};

exports.Prisma.DykeShelfCategoriesOrderByRelevanceFieldEnum = {
  name: 'name',
  type: 'type'
};

exports.Prisma.DykeShelfProductsOrderByRelevanceFieldEnum = {
  title: 'title',
  img: 'img'
};

exports.Prisma.DykeSalesErrorOrderByRelevanceFieldEnum = {
  errorId: 'errorId'
};

exports.Prisma.SalesTaxesOrderByRelevanceFieldEnum = {
  id: 'id',
  taxCode: 'taxCode'
};

exports.Prisma.TaxesOrderByRelevanceFieldEnum = {
  title: 'title',
  taxCode: 'taxCode',
  taxOn: 'taxOn'
};

exports.Prisma.SalesStatOrderByRelevanceFieldEnum = {
  status: 'status',
  type: 'type'
};

exports.Prisma.OrderItemProductionAssignmentsOrderByRelevanceFieldEnum = {
  note: 'note',
  salesItemControlUid: 'salesItemControlUid'
};

exports.Prisma.OrderProductionSubmissionsOrderByRelevanceFieldEnum = {
  note: 'note'
};

exports.Prisma.DykeSalesShelfItemOrderByRelevanceFieldEnum = {
  description: 'description'
};

exports.Prisma.SalesCommisionOrderByRelevanceFieldEnum = {
  status: 'status'
};

exports.Prisma.SalesOrderProductsOrderByRelevanceFieldEnum = {
  status: 'status'
};

exports.Prisma.RefundsOrderByRelevanceFieldEnum = {
  id: 'id',
  refId: 'refId',
  status: 'status',
  description: 'description'
};

exports.Prisma.RefundTransactionsOrderByRelevanceFieldEnum = {
  id: 'id',
  refundId: 'refundId'
};

exports.Prisma.CustomerTransactionOrderByRelevanceFieldEnum = {
  txId: 'txId',
  status: 'status',
  paymentMethod: 'paymentMethod',
  type: 'type',
  description: 'description',
  squarePID: 'squarePID'
};

exports.Prisma.CustomerWalletOrderByRelevanceFieldEnum = {
  accountNo: 'accountNo'
};

exports.Prisma.SalesPaymentsOrderByRelevanceFieldEnum = {
  note: 'note',
  squarePaymentsId: 'squarePaymentsId',
  status: 'status'
};

exports.Prisma.SquarePaymentsOrderByRelevanceFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  status: 'status',
  squareOrderId: 'squareOrderId',
  paymentMethod: 'paymentMethod',
  paymentLink: 'paymentLink',
  terminalId: 'terminalId'
};

exports.Prisma.SquarePaymentOrdersOrderByRelevanceFieldEnum = {
  id: 'id',
  squarePaymentId: 'squarePaymentId'
};

exports.Prisma.PaymentTerminalsOrderByRelevanceFieldEnum = {
  terminalId: 'terminalId',
  terminalName: 'terminalName'
};

exports.Prisma.SalesCheckoutOrderByRelevanceFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  status: 'status',
  paymentType: 'paymentType',
  terminalId: 'terminalId',
  terminalName: 'terminalName',
  squarePaymentId: 'squarePaymentId'
};

exports.Prisma.CheckoutTendersOrderByRelevanceFieldEnum = {
  id: 'id',
  tenderId: 'tenderId',
  salesCheckoutId: 'salesCheckoutId',
  status: 'status'
};

exports.Prisma.AutoCompletesOrderByRelevanceFieldEnum = {
  type: 'type',
  fieldName: 'fieldName',
  value: 'value'
};

exports.Prisma.AddressBooksOrderByRelevanceFieldEnum = {
  name: 'name',
  address1: 'address1',
  address2: 'address2',
  country: 'country',
  state: 'state',
  city: 'city',
  email: 'email',
  phoneNo: 'phoneNo',
  phoneNo2: 'phoneNo2'
};

exports.Prisma.ErrorLogOrderByRelevanceFieldEnum = {
  title: 'title',
  description: 'description',
  data: 'data',
  status: 'status'
};

exports.Prisma.ErrorTagsOrderByRelevanceFieldEnum = {
  name: 'name'
};

exports.Prisma.BuildersOrderByRelevanceFieldEnum = {
  name: 'name',
  slug: 'slug'
};

exports.Prisma.CostChartsOrderByRelevanceFieldEnum = {
  title: 'title',
  type: 'type',
  model: 'model'
};

exports.Prisma.CommunityModelsOrderByRelevanceFieldEnum = {
  modelName: 'modelName',
  slug: 'slug'
};

exports.Prisma.PageViewOrderByRelevanceFieldEnum = {
  url: 'url',
  group: 'group',
  searchParams: 'searchParams'
};

exports.Prisma.EventOrderByRelevanceFieldEnum = {
  type: 'type'
};

exports.Prisma.CommunityModelPivotOrderByRelevanceFieldEnum = {
  model: 'model'
};

exports.Prisma.CommunityModelCostOrderByRelevanceFieldEnum = {
  title: 'title',
  type: 'type',
  model: 'model'
};

exports.Prisma.HomesOrderByRelevanceFieldEnum = {
  homeKey: 'homeKey',
  slug: 'slug',
  modelName: 'modelName',
  modelNo: 'modelNo',
  lotBlock: 'lotBlock',
  lot: 'lot',
  block: 'block',
  status: 'status',
  address: 'address',
  search: 'search'
};

exports.Prisma.HomeTasksOrderByRelevanceFieldEnum = {
  type: 'type',
  taskName: 'taskName',
  taskUid: 'taskUid',
  status: 'status',
  producerName: 'producerName',
  search: 'search',
  productionStatus: 'productionStatus',
  checkNo: 'checkNo'
};

exports.Prisma.HomeTemplatesOrderByRelevanceFieldEnum = {
  slug: 'slug',
  modelNo: 'modelNo',
  modelName: 'modelName'
};

exports.Prisma.SalesItemSupplyOrderByRelevanceFieldEnum = {
  status: 'status',
  location: 'location',
  supplier: 'supplier'
};

exports.Prisma.OrderInventoryOrderByRelevanceFieldEnum = {
  category: 'category',
  name: 'name',
  description: 'description'
};

exports.Prisma.InventoryProductsOrderByRelevanceFieldEnum = {
  title: 'title',
  description: 'description',
  priceUpdateAt: 'priceUpdateAt',
  type: 'type',
  slug: 'slug',
  sku: 'sku',
  barcode: 'barcode',
  img: 'img',
  status: 'status',
  category: 'category',
  subCategory: 'subCategory',
  supplier: 'supplier'
};

exports.Prisma.InvoicesOrderByRelevanceFieldEnum = {
  refNo: 'refNo',
  lot: 'lot',
  block: 'block',
  checkNo: 'checkNo',
  taskName: 'taskName',
  taskUid: 'taskUid'
};

exports.Prisma.MigrationsOrderByRelevanceFieldEnum = {
  migration: 'migration'
};

exports.Prisma.ModelHasPermissionsOrderByRelevanceFieldEnum = {
  modelType: 'modelType'
};

exports.Prisma.ModelHasRolesOrderByRelevanceFieldEnum = {
  modelType: 'modelType'
};

exports.Prisma.PasswordResetsOrderByRelevanceFieldEnum = {
  email: 'email',
  token: 'token'
};

exports.Prisma.PermissionsOrderByRelevanceFieldEnum = {
  name: 'name'
};

exports.Prisma.PostsOrderByRelevanceFieldEnum = {
  title: 'title',
  slug: 'slug',
  type: 'type',
  content: 'content',
  status: 'status'
};

exports.Prisma.SettingsOrderByRelevanceFieldEnum = {
  type: 'type'
};

exports.Prisma.ProductsOrderByRelevanceFieldEnum = {
  slug: 'slug',
  section: 'section',
  name: 'name',
  description: 'description',
  size: 'size',
  type: 'type',
  box: 'box',
  finish: 'finish',
  length: 'length',
  per: 'per',
  unitQty: 'unitQty',
  itemNumber: 'itemNumber',
  lastUpdate: 'lastUpdate',
  note: 'note',
  priceType: 'priceType'
};

exports.Prisma.ProductVariantsOrderByRelevanceFieldEnum = {
  description: 'description',
  slug: 'slug',
  title: 'title',
  variantTitle: 'variantTitle',
  sku: 'sku',
  barcode: 'barcode',
  img: 'img',
  status: 'status',
  category: 'category',
  subCategory: 'subCategory',
  supplier: 'supplier'
};

exports.Prisma.ProgressOrderByRelevanceFieldEnum = {
  progressableType: 'progressableType',
  status: 'status',
  type: 'type',
  headline: 'headline',
  description: 'description'
};

exports.Prisma.ProjectsOrderByRelevanceFieldEnum = {
  title: 'title',
  address: 'address',
  slug: 'slug',
  refNo: 'refNo'
};

exports.Prisma.RolesOrderByRelevanceFieldEnum = {
  name: 'name'
};

exports.Prisma.SalesInvoiceItemsOrderByRelevanceFieldEnum = {
  item: 'item',
  description: 'description'
};

exports.Prisma.SalesInvoicesOrderByRelevanceFieldEnum = {
  slug: 'slug',
  invoiceNumber: 'invoiceNumber',
  customerName: 'customerName'
};

exports.Prisma.SalesJobsOrderByRelevanceFieldEnum = {
  jobId: 'jobId',
  status: 'status'
};

exports.Prisma.JobsOrderByRelevanceFieldEnum = {
  type: 'type',
  title: 'title',
  subtitle: 'subtitle',
  description: 'description',
  note: 'note',
  status: 'status',
  adminNote: 'adminNote'
};

exports.Prisma.JobPaymentsOrderByRelevanceFieldEnum = {
  checkNo: 'checkNo',
  paymentMethod: 'paymentMethod'
};

exports.Prisma.WorkOrdersOrderByRelevanceFieldEnum = {
  slug: 'slug',
  description: 'description',
  lot: 'lot',
  block: 'block',
  projectName: 'projectName',
  builderName: 'builderName',
  supervisor: 'supervisor',
  scheduleTime: 'scheduleTime',
  homeAddress: 'homeAddress',
  homeOwner: 'homeOwner',
  homePhone: 'homePhone',
  status: 'status'
};

exports.Prisma.NotificationsOrderByRelevanceFieldEnum = {
  type: 'type',
  message: 'message',
  link: 'link'
};

exports.Prisma.CacheOrderByRelevanceFieldEnum = {
  path: 'path',
  name: 'name',
  group: 'group'
};

exports.Prisma.BlogsOrderByRelevanceFieldEnum = {
  title: 'title',
  slug: 'slug',
  type: 'type',
  content: 'content',
  status: 'status'
};

exports.Prisma.GalleryOrderByRelevanceFieldEnum = {
  description: 'description',
  src: 'src'
};

exports.Prisma.GalleryTagNameOrderByRelevanceFieldEnum = {
  title: 'title'
};

exports.Prisma.SiteActionTicketOrderByRelevanceFieldEnum = {
  description: 'description',
  type: 'type',
  event: 'event'
};

exports.Prisma.SiteActionNotificationOrderByRelevanceFieldEnum = {
  event: 'event'
};

exports.Prisma.UsersOrderByRelevanceFieldEnum = {
  slug: 'slug',
  name: 'name',
  username: 'username',
  email: 'email',
  phoneNo: 'phoneNo',
  phoneCode: 'phoneCode',
  country: 'country',
  password: 'password',
  rememberToken: 'rememberToken'
};

exports.Prisma.SessionOrderByRelevanceFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken'
};

exports.Prisma.EmployeeProfileOrderByRelevanceFieldEnum = {
  name: 'name'
};

exports.Prisma.UserDocumentsOrderByRelevanceFieldEnum = {
  title: 'title',
  description: 'description',
  url: 'url'
};

exports.Prisma.ExportConfigOrderByRelevanceFieldEnum = {
  title: 'title',
  type: 'type'
};

exports.Prisma.PageTabsOrderByRelevanceFieldEnum = {
  page: 'page',
  title: 'title',
  query: 'query'
};

exports.Prisma.PageTabIndexOrderByRelevanceFieldEnum = {
  id: 'id'
};

exports.Prisma.SearchParametersOrderByRelevanceFieldEnum = {
  page: 'page',
  key: 'key',
  value: 'value'
};


exports.Prisma.ModelName = {
  GitTasks: 'GitTasks',
  Todos: 'Todos',
  GitTaskStatus: 'GitTaskStatus',
  GitTaskTags: 'GitTaskTags',
  Tags: 'Tags',
  MailGrids: 'MailGrids',
  MailEventTrigger: 'MailEventTrigger',
  Inbox: 'Inbox',
  InboxAttachments: 'InboxAttachments',
  NotePad: 'NotePad',
  NoteRecipients: 'NoteRecipients',
  NotePadContacts: 'NotePadContacts',
  NoteTags: 'NoteTags',
  NoteComments: 'NoteComments',
  NotePadEvent: 'NotePadEvent',
  NotePadReadReceipt: 'NotePadReadReceipt',
  Customers: 'Customers',
  CustomerTaxProfiles: 'CustomerTaxProfiles',
  DealerAuth: 'DealerAuth',
  DealerStatusHistory: 'DealerStatusHistory',
  DealerToken: 'DealerToken',
  CustomerTypes: 'CustomerTypes',
  DealerSalesRequest: 'DealerSalesRequest',
  OrderDelivery: 'OrderDelivery',
  OrderItemDelivery: 'OrderItemDelivery',
  SalesPickup: 'SalesPickup',
  CommissionPayment: 'CommissionPayment',
  SalesTakeOff: 'SalesTakeOff',
  SalesTakeOffSection: 'SalesTakeOffSection',
  SalesTakeOffComponent: 'SalesTakeOffComponent',
  SalesOrders: 'SalesOrders',
  SalesExtraCosts: 'SalesExtraCosts',
  SalesOrderItems: 'SalesOrderItems',
  QtyControl: 'QtyControl',
  SalesItemControl: 'SalesItemControl',
  HousePackageTools: 'HousePackageTools',
  ComponentPrice: 'ComponentPrice',
  DykeSalesDoors: 'DykeSalesDoors',
  DykeStepForm: 'DykeStepForm',
  DykeSteps: 'DykeSteps',
  DykeStepValues: 'DykeStepValues',
  DykeCategories: 'DykeCategories',
  DykeStepProducts: 'DykeStepProducts',
  ProductSortIndex: 'ProductSortIndex',
  DykePricingSystem: 'DykePricingSystem',
  DykeDoors: 'DykeDoors',
  DykeProducts: 'DykeProducts',
  DykeProductPrices: 'DykeProductPrices',
  DykeShelfCategories: 'DykeShelfCategories',
  DykeShelfProducts: 'DykeShelfProducts',
  DykeSalesError: 'DykeSalesError',
  SalesTaxes: 'SalesTaxes',
  Taxes: 'Taxes',
  SalesStat: 'SalesStat',
  OrderItemProductionAssignments: 'OrderItemProductionAssignments',
  OrderProductionSubmissions: 'OrderProductionSubmissions',
  DykeSalesShelfItem: 'DykeSalesShelfItem',
  SalesCommision: 'SalesCommision',
  SalesOrderProducts: 'SalesOrderProducts',
  Refunds: 'Refunds',
  RefundTransactions: 'RefundTransactions',
  CustomerTransaction: 'CustomerTransaction',
  CustomerWallet: 'CustomerWallet',
  SalesPayments: 'SalesPayments',
  SquarePayments: 'SquarePayments',
  SquarePaymentOrders: 'SquarePaymentOrders',
  PaymentTerminals: 'PaymentTerminals',
  SalesCheckout: 'SalesCheckout',
  CheckoutTenders: 'CheckoutTenders',
  AutoCompletes: 'AutoCompletes',
  AddressBooks: 'AddressBooks',
  ErrorLog: 'ErrorLog',
  ErrorLogTags: 'ErrorLogTags',
  ErrorTags: 'ErrorTags',
  Builders: 'Builders',
  CostCharts: 'CostCharts',
  CommunityModels: 'CommunityModels',
  CommunityTemplateHistory: 'CommunityTemplateHistory',
  PageView: 'PageView',
  Event: 'Event',
  CommunityModelPivot: 'CommunityModelPivot',
  CommunityModelCost: 'CommunityModelCost',
  Homes: 'Homes',
  HomeTasks: 'HomeTasks',
  HomeTemplates: 'HomeTemplates',
  SalesItemSupply: 'SalesItemSupply',
  Inventories: 'Inventories',
  OrderInventory: 'OrderInventory',
  InventoryProducts: 'InventoryProducts',
  Invoices: 'Invoices',
  Migrations: 'Migrations',
  ModelHasPermissions: 'ModelHasPermissions',
  ModelHasRoles: 'ModelHasRoles',
  PasswordResets: 'PasswordResets',
  Permissions: 'Permissions',
  Posts: 'Posts',
  Settings: 'Settings',
  ProductCategories: 'ProductCategories',
  Products: 'Products',
  ProductVariants: 'ProductVariants',
  Progress: 'Progress',
  Projects: 'Projects',
  RoleHasPermissions: 'RoleHasPermissions',
  Roles: 'Roles',
  SalesInvoiceItems: 'SalesInvoiceItems',
  SalesInvoices: 'SalesInvoices',
  SalesJobs: 'SalesJobs',
  Jobs: 'Jobs',
  JobPayments: 'JobPayments',
  WorkOrders: 'WorkOrders',
  Notifications: 'Notifications',
  Cache: 'Cache',
  Blogs: 'Blogs',
  Gallery: 'Gallery',
  GalleryTag: 'GalleryTag',
  GalleryTagName: 'GalleryTagName',
  SiteActionTicket: 'SiteActionTicket',
  SiteActionNotification: 'SiteActionNotification',
  SiteActionNotificationActiveForUsers: 'SiteActionNotificationActiveForUsers',
  Users: 'Users',
  Session: 'Session',
  EmployeeProfile: 'EmployeeProfile',
  UserDocuments: 'UserDocuments',
  ExportConfig: 'ExportConfig',
  PageTabs: 'PageTabs',
  PageTabIndex: 'PageTabIndex',
  SearchParameters: 'SearchParameters'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
