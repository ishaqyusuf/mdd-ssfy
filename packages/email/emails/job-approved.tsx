import {
  Body,
  Container,
  Heading,
  Preview,
  Text,
} from "@react-email/components";
import {
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "../components/theme";
import { Logo } from "../components/logo";
import { Footer } from "../components/footer";

type JobApprovedEmailProps = {
  recipientName?: string;
  reviewerName?: string;
  jobId?: number;
};

export function JobApprovedEmail(props: JobApprovedEmailProps) {
  const {
    recipientName = "Contractor",
    reviewerName = "Reviewer",
    jobId = 0,
  } = props;
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const previewText = `Job #${jobId} approved`;

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body
        className={`my-auto mx-auto font-sans ${themeClasses.body}`}
        style={lightStyles.body}
      >
        <Container
          className={`my-[40px] mx-auto p-[20px] max-w-[600px] ${themeClasses.container}`}
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: lightStyles.container.borderColor,
          }}
        >
          <Logo />
          <Heading
            className={`text-[21px] font-normal text-center p-0 my-[30px] mx-0 ${themeClasses.heading}`}
            style={{ color: lightStyles.text.color }}
          >
            Job Approved
          </Heading>
          <Text>Hi {recipientName},</Text>
          <Text>
            Job <strong>#{jobId}</strong> has been approved by {reviewerName}.
          </Text>
          <Text>You can now proceed with the next payment step.</Text>
          <br />
          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

export default JobApprovedEmail;
