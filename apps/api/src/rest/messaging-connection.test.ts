import { describe, expect, test } from "bun:test";
import { handleMessagingConnection } from "./messaging-connection";

describe("messaging connection boundary", () => {
  test("never issues a code without a dashboard origin", async () => {
    const result = await handleMessagingConnection(new Request("https://example.test/api/messaging/connection/issue", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: "connection", password: "password" }),
    }));
    expect(result.status).toBe(401);
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  test("does not disclose a connected extension without its bearer credential", async () => {
    const result = await handleMessagingConnection(new Request("https://example.test/api/messaging/connection/status", {
      method: "POST", body: JSON.stringify({ connectionId: "connection" }),
    }));
    expect(result.status).toBe(401);
  });
});
