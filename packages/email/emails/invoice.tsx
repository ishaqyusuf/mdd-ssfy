import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { Footer } from "../components/footer";
import { Logo } from "../components/logo";

import "./style.css";

interface Props {
  salesRep?: string;
  link?: string;
  paymentLink?: string;
  customerName: string;
  type: string;
  amountDue?: string;
  salesList?: { orderId: string; po: string; amount: string }[];
}
export const composeSalesEmail = (props: Props) => (
  <SalesInvoiceEmail {...props} />
);
export const SalesInvoiceEmail = ({
  salesRep,
  paymentLink,
  type,
  link,
  customerName,
  salesList,
}: Props) => {
  const isQuote = type == "quote";
  const text = `You've Received ${
    isQuote ? "a quote" : "an Invoice"
  } from GND Millwork 
    `;
  // ${salesRep}
  return (
    <Html>
      <Tailwind>
        <Head>
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-500-normal.woff2",
              format: "woff2",
            }}
            fontWeight={500}
            fontStyle="normal"
          />
        </Head>
        <Preview>{text}</Preview>
        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: "solid", borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[21px] font-normal text-[#121212]">
              You’ve Received {isQuote ? " a Quote" : " an Invoice"} <br /> from{" "}
              {salesRep}
            </Heading>
            <br />

            <span className="font-medium">Hi {customerName},</span>
            <Text className="text-[#121212]">
              {isQuote
                ? "Please review your quote"
                : `Please review your invoice and make sure to pay it
                            on time`}
              . If you have any questions, feel free to reply to this email.
            </Text>
            {!salesList?.length ? (
              <></>
            ) : (
              <Section className="">
                <table className="w-full">
                  <thead className="border border-gray-200 bg-gray-100 p-1">
                    <tr>
                      <th className="p-1 px-2" align="left">
                        Invoice No
                      </th>
                      <th className="p-1 px-2" align="left">
                        PO No.
                      </th>
                      <th className="p-1 px-2" align="right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesList?.map((sale, i) => (
                      <tr className="border border-gray-200" key={i}>
                        <td className="border-x border-gray-200" align="left">
                          {sale.orderId}
                        </td>
                        <td className="border-x border-gray-200" align="left">
                          {sale.po || "-"}
                        </td>
                        <td className="border-x border-gray-200" align="right">
                          {sale.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}
            <Section className="mb-[50px] mt-[50px] text-center">
              <Button
                className="border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] text-primary no-underline"
                href={link}
              >
                View {isQuote ? " quote" : " invoice"}
              </Button>
            </Section>
            <Section className="mb-[50px] mt-[50px] text-center">
              {!paymentLink || (
                <Button
                  className="border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] text-primary no-underline"
                  href={paymentLink}
                >
                  Make Payment
                </Button>
              )}
            </Section>

            <br />
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
