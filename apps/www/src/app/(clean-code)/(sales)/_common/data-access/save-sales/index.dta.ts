import { prisma } from "@/db";
import { SalesFormFields } from "../../../types";
import { SaveQuery, SaveSalesClass } from "./save-sales-class";
import { SalesBookFormIncludes } from "../../utils/db-utils";
import { nextId } from "@/lib/nextId";
import { SaveSalesHelper } from "./helper-class";

export async function saveSalesFormDta(
    form: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery
) {
    const worker = new SaveSalesClass(form, oldFormState, query);
    await worker.execute();
    return worker.result();
}
