import {
  Body,
  Button,
  Container,
  Heading,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { format } from "date-fns";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "../components/theme";

type AppDownloadExpiryReminderEmailProps = {
  recipientName?: string;
  version?: string | null;
  expiresAt: string;
  downloadApiUrl: string;
  sourceUrl: string;
  settingsUrl: string;
  notes?: string | null;
};

export function AppDownloadExpiryReminderEmail({
  recipientName = "Team",
  version,
  expiresAt,
  downloadApiUrl,
  sourceUrl,
  settingsUrl,
  notes,
}: AppDownloadExpiryReminderEmailProps) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const expiry = new Date(expiresAt);
  const expiryLabel = Number.isNaN(expiry.getTime())
    ? expiresAt
    : format(expiry, "MMMM d, yyyy");
  const previewText = `App download expires on ${expiryLabel}`;

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body
        className={`my-auto mx-auto font-sans ${themeClasses.body}`}
        style={lightStyles.body}
      >
        <Container
          className={`my-[40px] mx-auto p-[20px] max-w-[620px] ${themeClasses.container}`}
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: lightStyles.container.borderColor,
            borderRadius: 12,
          }}
        >
          <Logo />
          <Heading
            className={`text-[24px] leading-[32px] mb-[10px] ${themeClasses.heading}`}
            style={{ color: lightStyles.text.color }}
          >
            App Download Expiry Reminder
          </Heading>
          <Text className={themeClasses.text}>Hi {recipientName},</Text>
          <Text className={themeClasses.text}>
            The mobile app download link{version ? ` for version ${version}` : ""} is
            set to expire on <strong>{expiryLabel}</strong>.
          </Text>

          <Section
            className="my-[18px] rounded-[10px] p-[14px]"
            style={{
              borderStyle: "solid",
              borderWidth: 1,
              borderColor: lightStyles.container.borderColor,
              backgroundColor: "#f8fafc",
            }}
          >
            <Text className={themeClasses.text}>
              API download URL: <strong>{downloadApiUrl}</strong>
            </Text>
            <Text className={themeClasses.text}>
              Source link: <strong>{sourceUrl}</strong>
            </Text>
            {notes ? (
              <Text className={themeClasses.text}>
                Notes: <strong>{notes}</strong>
              </Text>
            ) : null}
          </Section>

          <Text className={themeClasses.text}>
            Update the link or extend the expiry before users lose access through the
            shared API route.
          </Text>

          <Button
            href={settingsUrl}
            className={themeClasses.button}
            style={{
              backgroundColor: "#111827",
              color: "#ffffff",
              borderRadius: 8,
              padding: "12px 18px",
              textDecoration: "none",
              display: "inline-block",
              marginTop: 8,
            }}
          >
            Open App Download Settings
          </Button>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

export default AppDownloadExpiryReminderEmail;
