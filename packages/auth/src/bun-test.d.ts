declare module "bun:test" {
	type TestCallback = () => void | Promise<void>;
	type Matcher = {
		rejects: PromiseMatcher;
		resolves: PromiseMatcher;
		toBe(value: unknown): void;
		toEqual(value: unknown): void;
		toThrow(value?: unknown): void;
	};
	type PromiseMatcher = {
		toBeUndefined(): Promise<void>;
		toThrow(value?: unknown): Promise<void>;
	};
	type Expect = {
		(value: unknown): Matcher;
	};
	export function describe(name: string, callback: TestCallback): void;
	export const expect: Expect;
	export function test(name: string, callback: TestCallback): void;
}
