"use client";

import { addDays } from "date-fns";
import { getCustomerWalletId } from "@/actions/get-customer-wallet-id";
import { generateToken } from "@/actions/token-action";
import { useAuth } from "@/hooks/use-auth";
import type { SalesPaymentTokenSchema, SalesPdfToken } from "@gnd/utils/tokenizer";
import type { SalesPrintModes } from "@sales/constants";
import { Chat, useChat } from "../chat";
import { Inbox } from "../inbox";

const channelNames = ["sales_info", "sales_email_reminder"] as const;

const paymentLinkOptions = [
  { label: "No", value: "no" },
  { label: "50%", value: "50" },
  { label: "75%", value: "75" },
  { label: "Full", value: "full" },
];

const invoiceDownloadOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const defaultPayloads = {
  sales_email_reminder: {
    paymentLinkOption: "no",
    invoiceDownload: "no",
  },
};

function SalesInboxComposer() {
  const chat = useChat();
  const isReminderChannel = chat.state.channel === "sales_email_reminder";

  return (
    <>
      <Chat.Header>
        <Chat.ChannelsOption names={channelNames} />
      </Chat.Header>
      <Chat.Options>
        <Chat.PayloadOption
          show={isReminderChannel}
          required={isReminderChannel}
          name="paymentLinkOption"
          label="payment link"
          options={paymentLinkOptions}
        />
        <Chat.PayloadOption
          show={isReminderChannel}
          required={isReminderChannel}
          name="invoiceDownload"
          label="invoice download"
          options={invoiceDownloadOptions}
        />
      </Chat.Options>
      <Chat.Content
        placeholder={
          isReminderChannel
            ? "Add internal note for this reminder (optional)..."
            : "Write a sales activity note..."
        }
      />
      <Chat.Footer>
        <Chat.ColorPicker />
        <div className="flex-1" />
        <Chat.SendButton
          label={isReminderChannel ? "Send reminder" : "Send note"}
        />
      </Chat.Footer>
    </>
  );
}

type SalesOverviewInboxProps = {
  saleData: any;
};

export function SalesOverviewInbox({ saleData }: SalesOverviewInboxProps) {
  const auth = useAuth();

  if (!saleData?.id) return null;

  const dueAmount = Number(saleData?.due ?? saleData?.invoice?.pending ?? 0);

  return (
    <Inbox
      channel="sales_info"
      names={channelNames}
      query={{
        tags: [
          {
            tagName: "salesId",
            tagValue: saleData.id,
          },
        ],
      }}
      payload={{
        salesId: saleData.id,
        salesNo: saleData.orderId,
        note: "",
        color: "",
        type: saleData?.isQuote ? "quote" : "order",
        customerEmail: saleData?.email || "",
        customerName: saleData?.displayName || "",
        salesRep: saleData?.salesRep || "",
        salesRepEmail: auth?.email || "",
        sales: [
          {
            orderId: saleData?.orderId || "",
            po: saleData?.poNo || null,
            date: saleData?.salesDate || new Date().toISOString(),
            total: Number(saleData?.invoice?.total || 0),
            due: dueAmount,
          },
        ],
      }}
      defaultPayloads={defaultPayloads}
      transformSubmitData={async (payload) => {
        const paymentLinkOption = payload.paymentLinkOption;
        const invoiceDownload = payload.invoiceDownload;
        const isReminderTransform =
          typeof paymentLinkOption === "string" ||
          typeof invoiceDownload === "string";

        if (!isReminderTransform || !saleData?.id) {
          return {};
        }

        const expiry = addDays(new Date(), 7).toISOString();
        const mode = (saleData?.isQuote
          ? "quote"
          : "order") as SalesPrintModes;
        const transformed: Record<string, string | null> = {
          paymentToken: null,
          pdfToken: null,
        };

        if (invoiceDownload === "yes") {
          transformed.pdfToken = await generateToken({
            salesIds: [saleData.id],
            expiry,
            mode,
          } satisfies SalesPdfToken);
        }

        const paymentPercentageMap: Record<string, number> = {
          "50": 50,
          "75": 75,
          full: 100,
        };
        const selectedPercentage = paymentPercentageMap[paymentLinkOption] || 0;

        if (selectedPercentage > 0 && dueAmount > 0) {
          const walletId = await getCustomerWalletId(saleData.accountNo);
          if (!walletId) {
            throw new Error("Customer wallet is required for payment link.");
          }
          transformed.paymentToken = await generateToken({
            salesIds: [saleData.id],
            expiry,
            walletId,
            amount: (dueAmount * selectedPercentage) / 100,
            percentage: selectedPercentage,
          } satisfies SalesPaymentTokenSchema);
        }

        return transformed;
      }}
      placeholder="Write a sales activity note..."
    >
      <SalesInboxComposer />
    </Inbox>
  );
}
