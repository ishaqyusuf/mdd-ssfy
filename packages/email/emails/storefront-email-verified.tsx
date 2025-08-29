import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailProps {
  name?: string;
  storeUrl?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const EmailVerifiedEmail = ({
  name = "Valued Customer",
  storeUrl = `${baseUrl}/shop`,
}: EmailProps) => (
  <Html>
    <Head />
    <Preview>Email Verified</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/static/logo-email.png`}
          width="212"
          height="49"
          alt="GND"
          style={logo}
        />
        <Heading style={h1}>Email Verified</Heading>
        <Text style={text}>Hello {name},</Text>
        <Text style={text}>
          Your email has been successfully verified. You can now login to your
          account and start shopping.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={storeUrl}>
            Start Shopping
          </Button>
        </Section>
        <Text style={text}>
          If you have any questions, please don't hesitate to contact us.
        </Text>
        <Text style={text}>
          Thanks,
          <br />
          The GND Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailVerifiedEmail;

const main = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px 0 48px",
  border: "1px solid #eaeaea",
  borderRadius: "5px",
};

const logo = {
  margin: "0 auto",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 20px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#000",
  color: "#fff",
  fontSize: "14px",
  textDecoration: "none",
  borderRadius: "5px",
  padding: "12px 20px",
};
