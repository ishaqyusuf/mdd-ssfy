declare module "bun:test" {
	type TestCallback = () => void | Promise<void>;
	type Matcher = {
		not: Matcher;
		toBe(value: unknown): void;
		toContain(value: unknown): void;
		toEqual(value: unknown): void;
		toMatchObject(value: unknown): void;
	};
	type Expect = (value: unknown) => Matcher;

	export function describe(name: string, callback: TestCallback): void;
	export const expect: Expect;
	export function it(name: string, callback: TestCallback): void;
	export function test(name: string, callback: TestCallback): void;
}
