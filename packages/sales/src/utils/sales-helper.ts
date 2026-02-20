import { SalesPdfToken } from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { SalesPrintModes } from "src/constants";

export class SalesHelper {
  #token: string = "";
  constructor(
    public baseUrl: string,
    public generator,
    public shareFn,
    public openLinkFn,
  ) {}
  async generateTokenSalesIds(salesIds: number[], mode: SalesPrintModes) {
    this.#token = await this.generator({
      salesIds,
      expiry: addDays(new Date(), 7).toISOString(),
      mode,
    } as SalesPdfToken);
  }
  async generateTokenDispatchId(salesId: number, dispatchId: number) {
    this.#token = await this.generator({
      salesIds: [salesId],
      dispatchId,
      expiry: addDays(new Date(), 7).toISOString(),
      mode: "packing list" as SalesPrintModes,
    } as SalesPdfToken);
  }
  public get shareUrl() {
    return `${this.baseUrl}/api/download/sales?token=${this.#token}&preview=false`;
  }
  public async share(msg, recipient) {
    await this.shareFn({
      url: this.shareUrl,
      msg,
      recipient,
    });
  }
  public openPrintLink(pdf = false) {
    const path = pdf ? `api/download/sales` : `p/sales-invoice`;
    const preview = !pdf;
    this.openLinkFn(
      path,
      {
        token: this.#token,
        preview,
      },
      true,
    );
  }
}
