import { createWhatsAppClient } from "@gnd/app-store/whatsapp-client";
import { logger } from "@gnd/logger";
import type { UserData } from "../base";

type WhatsAppInput = {
  user: UserData;
  message: string;
};

function normalizePhoneNumber(phoneNo?: string): string | null {
  if (!phoneNo) return null;
  const raw = phoneNo.trim();
  if (!raw) return null;

  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export class WhatsAppService {
  async sendBulk(messages: WhatsAppInput[]) {
    if (!messages.length) {
      return {
        sent: 0,
        skipped: 0,
        failed: 0,
      };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
      logger.warn(
        "WhatsApp notification skipped: missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN",
      );
      return {
        sent: 0,
        skipped: messages.length,
        failed: 0,
      };
    }

    let client: ReturnType<typeof createWhatsAppClient>;
    try {
      client = createWhatsAppClient();
    } catch (error) {
      logger.warn(
        `WhatsApp notification skipped: failed to initialize WhatsApp client (${String(error)})`,
      );
      return {
        sent: 0,
        skipped: messages.length,
        failed: 0,
      };
    }
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const input of messages) {
      const phone = normalizePhoneNumber(input.user.phoneNo);
      if (!phone) {
        skipped += 1;
        continue;
      }

      try {
        await client.sendMessage(phone, input.message);
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    return { sent, skipped, failed };
  }
}
