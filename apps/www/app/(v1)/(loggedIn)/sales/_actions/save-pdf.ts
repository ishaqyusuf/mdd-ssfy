"use server";
import { prisma } from "@/db";
type SalesPrintModes =
    | "production"
    | "packing list"
    | "order"
    | "quote"
    | "invoice";
export async function printSalesPdf(mode: SalesPrintModes, ids) {
    const pdf = await _generateSalesPdf(mode, ids);
    const pdfDataUri = `data:application/pdf;base64,${pdf}`;
    const orders = await prisma.salesOrders.findMany({
        where: {
            deletedAt: null,
            id: {
                in: ids
                    .toString()
                    .split(",")
                    .map((i) => Number(i)),
            },
        },
        select: {
            orderId: true,
        },
    });
    return {
        fileName: [orders.map((o) => o.orderId).join("&"), ".pdf"].join(""),
        uri: pdfDataUri,
        pdf,
    };
}
export async function _generateSalesPdf(mode: SalesPrintModes, ids) {
    let browser, page, url;
    const puppeteer = require("puppeteer-core");
    browser = await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BLESS_TOKEN}`,
    });
    // console.log(">>>>>>");
    page = await browser.newPage();
    if (process.env.NODE_ENV == "production") {
        url = `https://gndprodesk.com/printer/sales?slugs=${ids}&mode=${mode}&preview=true`;
    } else {
        url = `http://localhost:3000/printer/sales?slugs=${ids}&mode=${mode}&preview=true`;
    }
    await page.goto(url, {
        waitUntil: "networkidle0",
    });

    await page.emulateMediaType("print");

    const pdf = await page.pdf({
        format: "Letter",
        margin: {
            left: "0.39in",
            top: "0.39in",
            right: "0.39in",
            bottom: "0.39in",
        },
        // scale: 0.75,
        printBackground: true,
    });

    await browser.close();
    return pdf;
}
