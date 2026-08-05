import { beforeEach, describe, expect, it } from "bun:test";
import { useSearchStore } from "./search";

describe("search store launch context", () => {
	beforeEach(() => {
		useSearchStore.setState({
			isOpen: false,
			launchSource: null,
		});
	});

	it("shows sales-create guidance only for that launch source", () => {
		useSearchStore.getState().openSearch("sales-create");

		expect(useSearchStore.getState()).toMatchObject({
			isOpen: true,
			launchSource: "sales-create",
		});

		useSearchStore.getState().setOpen(false);

		expect(useSearchStore.getState()).toMatchObject({
			isOpen: false,
			launchSource: null,
		});
	});

	it("keeps ordinary Find Anything opens message-free", () => {
		useSearchStore.getState().openSearch();

		expect(useSearchStore.getState()).toMatchObject({
			isOpen: true,
			launchSource: null,
		});
	});
});
