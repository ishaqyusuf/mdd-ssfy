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

type JobAssignedEmailProps = {
  id?: number;
  assignedToName?: string;
  authorContactName?: string;
};

export function JobAssignedEmail(props: JobAssignedEmailProps) {
  const {
    id = 0,
    assignedToName = "Contractor",
    authorContactName = "Team",
  } = props;
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const previewText = `New job assigned #${id}`;

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
            New Job Assigned
          </Heading>
          <Text>Hi {assignedToName},</Text>
          <Text>
            {authorContactName} assigned you to job <strong>#{id}</strong>.
          </Text>
          <Text>Please review the job details and start work.</Text>
          <br />
          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

export default JobAssignedEmail;
