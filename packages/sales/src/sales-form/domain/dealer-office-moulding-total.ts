import { multiplyMoney, roundMoney } from "../../payment-system/domain/money";
import { readSalesFormObjectMetadata } from "./metadata";

/** Keep an allocated office cent until the row's quantity or unit price changes. */
export function resolveDealerOfficeMouldingTotal(
	row: Record<string, unknown>,
	qty: number,
	unitPrice: number,
) {
	const saved = readSalesFormObjectMetadata(row.dealerOfficeTotal);
	const calculated = multiplyMoney(qty, unitPrice);
	const preserve =
		saved &&
		Number(saved.qty) === qty &&
		roundMoney(Number(saved.unitPrice)) === roundMoney(unitPrice) &&
		Number.isFinite(Number(saved.totalPrice)) &&
		Math.abs(Number(saved.totalPrice) - calculated) <= qty * 0.005 + 0.000001;
	return {
		lineTotal: preserve ? roundMoney(Number(saved.totalPrice)) : calculated,
		dealerOfficeTotal: preserve ? saved : null,
	};
}
