"use server";
import { AsyncFnType } from "@/app/(clean-code)/type";
import { logError } from "../error/report";
import { env } from "@/env.mjs";
import { uploadPDFToCloudinary } from "../cloudinary";
import { generateRandomString } from "@/lib/utils";

interface Props {
    list: {
        url?;
        pdfConfig?: PdfConfig;
        fileName?;
        folder?;
    }[];
}
export type PdfConfig = {
    format: "Letter" | "A4";
    margin?: {
        left?;
        top?;
        right?;
        bottom?;
    };
    printBackground?: boolean;
};
export async function createPdf(props: Props) {
    const validList = props.list?.filter((l) => l.url);
    if (!validList?.length) {
        return [];
    }
    let ctx;
    try {
        ctx = await initBrowserless();
        const pdfs = await Promise.all(
            validList?.map(async (ls) => {
                try {
                    const pdf = await printPage(ctx, ls);
                    const pdfURI = pdf.toString("base64");
                    const resp = {
                        pdf,
                        pdfURI,
                        cloudinary: null,
                        cloudinaryError: null,
                        // _cloudinary: {},
                    };
                    try {
                        const r = await uploadPDFToCloudinary(
                            pdf,
                            ls.fileName || generateRandomString(),
                            ls.folder
                        );
                        resp.cloudinary = r;
                        // r.url
                    } catch (error) {
                        resp.cloudinaryError = error;
                    }
                    return resp;
                } catch (error) {
                    return {
                        error: error.message,
                        pdf: null,
                    };
                }
            })
        );
        await ctx?.browser?.close();
        return pdfs;
    } catch (error) {
        await ctx?.browser?.close();
        return [
            {
                error: error.message,
            },
        ];
    }
}
type Ctx = AsyncFnType<typeof initBrowserless>;
async function printPage(ctx: Ctx, pageData: Props["list"][number]) {
    try {
        await ctx.page.goto(pageData.url, {
            waitUntil: "networkidle0",
        });
        await ctx.page.emulateMediaType("print");
        const pdf = await ctx.page.pdf({
            format: "Letter",
            printBackground: true,
        });
        return pdf;
    } catch (error) {
        await logError(error, "Unable to generate pdf", "severe", [
            "chromium-aws",
            "pdf",
        ]);
        throw Error(error);
        // throw Error("Error generating PDF with chrome-aws-lamba", error);
    }
}
async function initChromium() {
    // try {
    //     const puppeteer = require("puppeteer-core");
    //     const chromium = require("chrome-aws-lambda");
    //     const browser = await puppeteer.launch({
    //         args: chromium.args,
    //         executablePath: await chromium.executablePath,
    //         headless: chromium.headless,
    //     });
    //     const page = await browser.newPage();
    //     return {
    //         page,
    //         browser,
    //     };
    // } catch (error) {
    //     await logError(error, "Unable to initializing chromium", "severe", [
    //         "chromium-aws",
    //     ]);
    //     throw Error("Error initializing chromium", error);
    // }
}
async function initBrowserless() {
    try {
        const puppeteer = require("puppeteer-core");
        const browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${env.BLESS_TOKEN}`,
        });
        // const browser = await puppeteer.launch({
        //     headless: true,
        //     // args: ["--no-sandbox", "--disable-setuid-sandbox"],
        // });
        const page = await browser.newPage();
        return {
            page,
            browser,
        };
    } catch (error) {
        await logError(error, "Unable to initializing browserless", "severe", [
            "browserless",
        ]);
        throw Error("Error initializing browserless", error);
    }
}
