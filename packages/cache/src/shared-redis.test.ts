import { afterEach, expect, test } from "bun:test";
import net from "node:net";
import { closeSharedRedisClient, waitForRedisReady } from "./shared-redis";

const previousRedisUrl = process.env.REDIS_URL;

afterEach(() => {
  closeSharedRedisClient();
  if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = previousRedisUrl;
});

test("retries Redis after the startup connection fails", async () => {
  const server = net.createServer((socket) => {
    socket.on("data", () => socket.write("+PONG\r\n"));
  });
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));

  process.env.REDIS_URL = `redis://127.0.0.1:${port}`;
  expect(await waitForRedisReady(500)).toBe(false);

  try {
    server.listen(port, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    expect(await waitForRedisReady(1_000)).toBe(true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 5_000);
