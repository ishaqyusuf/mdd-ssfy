import { prisma } from "@/db";
import SalesDownload from "./sales";

export default async function DownloadPage({ params }) {
    const [path, token, slug]: ["sales", string, string] = params.slugs;

    const order = await prisma.salesOrders.findFirst({
        where: {
            orderId: slug?.toString(),
        },
    });
    // console.log(order.type);
    // return <></>;
    return <SalesDownload id={order.orderId} mode={order.type} />;
}
