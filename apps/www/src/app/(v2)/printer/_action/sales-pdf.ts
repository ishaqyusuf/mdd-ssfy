"use server";
import { env } from "@/env.mjs";
import { SalesPrintProps } from "../sales/page";
import QueryString from "qs";
import { uploadPDFToCloudinary } from "@/modules/cloudinary";
import { generateRandomString } from "@/lib/utils";
import dayjs from "dayjs";

export async function salesPdf(query: SalesPrintProps["searchParams"]) {
    const pdf = await geenrate(query);
    // const pdfDataUri = `data:application/pdf;base64,${pdf.toString("base64")}`;
    const cloudinary = await uploadPDFToCloudinary(
        pdf,
        `${query.slugs}-${dayjs().valueOf()}.pdf`,
        "sales-orders"
    );
    return {
        // uri: pdfDataUri,
        // pdf: pdf,
        url: cloudinary.downloadUrl,
        // url: cloudinary.
    };
}
async function geenrate(query: SalesPrintProps["searchParams"]) {
    // let   page, url;
    const puppeteer = require("puppeteer-core");
    let browser = await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${env.BLESS_TOKEN}`,
    });
    let page = await browser.newPage();
    await page.setCacheEnabled(false);
    // console.log(query);
    let url = `${env.NEXT_PUBLIC_APP_URL}/printer/sales?${QueryString.stringify(
        {
            ...query,
            rnd: generateRandomString(),
        }
    )}`;

    await page.goto(url, {
        // waitUntil: "domcontentloaded",
        waitUntil: "networkidle0",
    });
    // await timeout(2000);
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
