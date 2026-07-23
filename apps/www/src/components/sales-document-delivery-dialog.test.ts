import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const dialogSource = readFileSync(
	new URL("./sales-document-email-dialog.tsx", import.meta.url),
	"utf8",
);
const menuSource = readFileSync(
	new URL("./sales-menu.tsx", import.meta.url),
	"utf8",
);

describe("sales document delivery dialog", () => {
	test("offers explicit email, WhatsApp, and SMS channel intent", () => {
		expect(dialogSource).toContain(
			"const [channels, setChannels] = useState<SalesDocumentDeliveryChannel[]>",
		);
		expect(dialogSource).toContain('["whatsapp", "WhatsApp", Icons.WhatsApp]');
		expect(dialogSource).toContain('["sms", "SMS", Icons.Smartphone]');
		expect(dialogSource).toContain("channels,");
	});

	test("keeps phone channels unavailable until the recipient is valid", () => {
		expect(dialogSource).toContain("isValidCustomerPhoneNumber(phone)");
		expect(dialogSource).toContain(
			"Add a valid customer phone number to enable WhatsApp and SMS.",
		);
		expect(dialogSource).toContain("!wantsPhone || isPhoneValid");
	});

	test("routes the former ad hoc share action into audited delivery", () => {
		expect(menuSource).not.toContain("@gnd/utils/share");
		expect(menuSource).toContain("actions.openComposeEmail()");
		expect(menuSource).toContain("Send Document");
	});
});
