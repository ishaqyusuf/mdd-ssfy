export const salesOrder = {
  customer: {
    name: "John Doe",
    isBusiness: true,
    phone: "+1 234 567 890",
    email: "john.doe@example.com",
  },
  payment: {
    progress: 75, // in percent
    breakdown: {
      paid: 750,
      pending: 250,
      subtotal: 1000,
      taxes: 50,
      discount: 0,
      labor: 100,
    },
  },
  poNumber: "PO-12345",
  date: "2025-11-26",
  dispatchOption: "Delivery",
};

export const productionItems = [
  {
    id: 1,
    name: "Custom Cabinet",
    description: "A custom-made cabinet for the kitchen.",
    quantity: 2,
    status: {
      assigned: 2,
      produced: 1,
      delivered: 0,
    },
    details: [
      { label: "Item Type", value: "Interior" },
      { label: "Height", value: "6-8 ft" },
      { label: "Material", value: "Oak" },
    ],
    assignments: [
      { id: 1, assignedTo: "Woodworking Team", quantity: 2, date: "2025-11-27" },
    ],
    submissions: [
        { id: 1, submittedBy: "Woodworking Team", quantity: 1, date: "2025-11-28" },
    ],
    notes: "Customer requested a specific type of handle.",
  },
  {
    id: 2,
    name: "Bookshelf",
    description: "A large bookshelf for the living room.",
    quantity: 1,
    status: {
      assigned: 1,
      produced: 0,
      delivered: 0,
    },
    details: [
        { label: "Item Type", value: "Furniture" },
        { label: "Width", value: "4 ft" },
        { label: "Material", value: "Pine" },
    ],
    assignments: [
        { id: 1, assignedTo: "Assembly Team", quantity: 1, date: "2025-11-27" },
    ],
    submissions: [],
    notes: "",
  },
];

export const transactions = [
    { id: 1, date: "2025-11-26", amount: 500, method: "Credit Card", status: "Completed" },
    { id: 2, date: "2025-11-27", amount: 250, method: "Bank Transfer", status: "Completed" },
    { id: 3, date: "2025-11-28", amount: 250, method: "Cash", status: "Pending" },
];

export const dispatches = [
    { id: 1, dispatchNo: "DIS-001", status: "Pending", items: [{ name: "Custom Cabinet", quantity: 1 }] },
];