import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./inbound-overview-content.tsx", import.meta.url),
	"utf8",
);

describe("InboundOverviewContent collapsible activity chat form", () => {
	test("provides a headerAction button to toggle the collapsible chat form", () => {
		expect(source).toContain("headerAction={");
		expect(source).toContain('onClick={() => setIsChatOpen((open) => !open)}');
		expect(source).toContain('<span>{isChatOpen ? "Close" : "Add note"}</span>');
	});

	test("renders the collapsible chat form container with Attachments, file upload, and send controls", () => {
		expect(source).toContain("<Collapsible open={isChatOpen}");
		expect(source).toContain("function Attachments(");
		expect(source).toContain('id="inbound-collapsible-chat-upload"');
		expect(source).toContain('placeholder="Write a comment..."');
		expect(source).toContain("<Icons.Send");
		expect(source).toContain("saveInboundNoteMutation.mutate({");
	});
});
