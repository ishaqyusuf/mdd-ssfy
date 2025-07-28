import { db } from "@gnd/db";

export class SalesController {
  constructor(public prisma: typeof db) {}
  async submitAssignment() {
    // this.prisma.orderProductionSubmissions.create({
    //   data: {},
    // });
  }
}
