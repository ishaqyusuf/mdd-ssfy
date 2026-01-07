export function getAddress(sale) {
  console.log(sale.order?.orderId);
  const [miami, lakeWales] = [
    {
      address1: "13285 SW 131 ST",
      address2: "Miami, Fl 33186",
      phone: "305-278-6555",
      fax: "305-278-2003",
    },
    {
      address1: "1750 Longleaf Blvd, Suite11",
      address2: "Lake Wales FL 33859",
      phone: "863-275-1011",
      fax: undefined,
    },
  ];
  return ["lrg", "vc"]?.some((a) =>
    sale?.order?.orderId?.toLowerCase()?.endsWith(a)
  )
    ? lakeWales
    : miami;
}
