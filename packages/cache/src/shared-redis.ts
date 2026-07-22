import { createLoggerWithContext } from "@gnd/logger";
import net from "node:net";
import tls from "node:tls";

const logger = createLoggerWithContext("redis");

type RedisCommandValue = string | number;
type RedisSocket = net.Socket | tls.TLSSocket;

const CONNECT_TIMEOUT_MS = 1_500;

export function resolveRedisUrl(): string {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  throw new Error("No Redis URL configured. Set REDIS_URL.");
}

function encodeCommand(command: RedisCommandValue[]) {
  return command.reduce((acc, part, index) => {
    const value = index === 0 ? String(part).toUpperCase() : String(part);
    return `${acc}$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  }, `*${command.length}\r\n`);
}

function parseResp(buffer: Buffer): { value: unknown; bytes: number } | null {
  const prefix = String.fromCharCode(buffer[0] ?? 0);
  const lineEnd = buffer.indexOf("\r\n");
  if (lineEnd === -1) return null;

  const line = buffer.subarray(1, lineEnd).toString("utf8");

  switch (prefix) {
    case "+": {
      return { value: line, bytes: lineEnd + 2 };
    }
    case "-": {
      throw new Error(line);
    }
    case ":": {
      return { value: Number(line), bytes: lineEnd + 2 };
    }
    case "$": {
      const length = Number(line);
      if (length === -1) return { value: null, bytes: lineEnd + 2 };

      const start = lineEnd + 2;
      const end = start + length;
      if (buffer.length < end + 2) return null;

      return {
        value: buffer.subarray(start, end).toString("utf8"),
        bytes: end + 2,
      };
    }
    default:
      throw new Error(`Unsupported Redis response type "${prefix}"`);
  }
}

function connect(url: URL): Promise<RedisSocket> {
  const port = Number(url.port || (url.protocol === "rediss:" ? 6379 : 6379));
  const host = url.hostname;

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;
    let socket: RedisSocket;
    const handleConnect = () => {
      clearTimeout(timeout);
      resolve(socket);
    };

    socket =
      url.protocol === "rediss:"
        ? tls.connect({ host, port, servername: host }, handleConnect)
        : net.connect({ host, port }, handleConnect);

    timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Redis connection timed out after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function authCommands(url: URL): RedisCommandValue[][] {
  const commands: RedisCommandValue[][] = [];
  const username = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");

  if (password && username) {
    commands.push(["AUTH", username, password]);
  } else if (password) {
    commands.push(["AUTH", password]);
  }

  const db = url.pathname.replace("/", "");
  if (db) {
    commands.push(["SELECT", db]);
  }

  return commands;
}

class SharedRedisClient {
  connected = false;

  async connect(): Promise<void> {
    await this.send("PING", []);
  }

  close(): void {
    this.connected = false;
  }

  async get(key: string): Promise<string | null> {
    return (await this.send("GET", [key])) as string | null;
  }

  async set(key: string, value: string): Promise<unknown> {
    return this.send("SET", [key, value]);
  }

  async del(key: string): Promise<unknown> {
    return this.send("DEL", [key]);
  }

  async send(command: string, args: RedisCommandValue[]): Promise<unknown> {
    const url = new URL(resolveRedisUrl());
    const socket = await connect(url);
    const commands = [...authCommands(url), [command, ...args]];
    let pending = commands.length;
    let responseBuffer = Buffer.alloc(0);
    let lastValue: unknown = null;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        socket.removeAllListeners();
        socket.end();
        socket.destroy();
      };

      socket.on("data", (chunk) => {
        try {
			responseBuffer = Buffer.concat([
				responseBuffer as unknown as Uint8Array<ArrayBufferLike>,
				chunk as unknown as Uint8Array<ArrayBufferLike>,
			]);

          while (pending > 0) {
            const parsed = parseResp(responseBuffer);
            if (!parsed) return;

            responseBuffer = responseBuffer.subarray(parsed.bytes);
            lastValue = parsed.value;
            pending -= 1;
          }

          this.connected = true;
          cleanup();
          resolve(lastValue);
        } catch (error) {
          this.connected = false;
          cleanup();
          reject(error);
        }
      });

      socket.once("error", (error) => {
        this.connected = false;
        cleanup();
        reject(error);
      });

      socket.write(commands.map(encodeCommand).join(""));
    });
  }
}

let sharedClient: SharedRedisClient | null = null;
let initialConnectPromise: Promise<void> | null = null;

export function getSharedRedisClient(): SharedRedisClient {
  if (sharedClient) return sharedClient;

  logger.info("Creating new Redis client");
  sharedClient = new SharedRedisClient();
  initialConnectPromise = sharedClient.connect().catch((error) => {
    logger.error("Initial connection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return sharedClient;
}

export function waitForRedisReady(timeoutMs = 2_000): Promise<boolean> {
  const client = getSharedRedisClient();
  if (client.connected) return Promise.resolve(true);

  return Promise.race([
    (initialConnectPromise ?? client.connect()).then(() => client.connected),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), timeoutMs),
    ),
  ]);
}

export function closeSharedRedisClient(): void {
  if (sharedClient) {
    logger.info("Closing shared Redis client");
    sharedClient.close();
    sharedClient = null;
    initialConnectPromise = null;
  }
}
