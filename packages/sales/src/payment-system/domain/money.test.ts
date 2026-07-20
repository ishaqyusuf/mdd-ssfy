import { describe, expect, it } from "bun:test";

import {
	addMoney,
	divideMoney,
	moneyRatio,
	multiplyMoney,
	roundMoney,
	subtractMoney,
	sumMoney,
} from "./money";

describe("sales money", () => {
	it("rounds decimal midpoint values half up to two decimal places", () => {
		expect(roundMoney(1.005)).toBe(1.01);
		expect(roundMoney(2.675)).toBe(2.68);
		expect(roundMoney(-1.005)).toBe(-1.01);
	});

	it("performs decimal-safe arithmetic at the money boundary", () => {
		expect(addMoney(0.1, 0.2)).toBe(0.3);
		expect(subtractMoney(10, 2.675)).toBe(7.33);
		expect(multiplyMoney(77.896, 3)).toBe(233.69);
		expect(divideMoney(30.05, 3)).toBe(10.02);
		expect(multiplyMoney(49, moneyRatio(100, 98))).toBe(50);
		expect(sumMoney([0.1, 0.2, 2.675])).toBe(2.98);
	});

	it("normalizes invalid inputs and division by zero to zero", () => {
		expect(roundMoney(Number.NaN)).toBe(0);
		expect(divideMoney(10, 0)).toBe(0);
	});
});
