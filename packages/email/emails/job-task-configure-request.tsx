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

type JobTaskConfigureRequestEmailProps = {
  recipientName?: string;
  contractorName?: string;
  contractorId?: number;
  modelName?: string;
  projectName?: string;
  builderName?: string;
};

export function JobTaskConfigureRequestEmail(
  props: JobTaskConfigureRequestEmailProps,
) {
  const {
    recipientName = "Team",
    contractorName = "Contractor",
    contractorId = 0,
    modelName = "-",
    projectName = "-",
    builderName = "-",
  } = props;
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const previewText = "Contractor submission blocked: install task list missing";

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
            Install Task List Missing
          </Heading>
          <Text>Hi {recipientName},</Text>
          <Text>
            {contractorName} (ID: {contractorId}) is trying to submit a job, but
            the install task list is missing.
          </Text>
          <Text>
            Model: <strong>{modelName}</strong>
          </Text>
          <Text>
            Project: <strong>{projectName}</strong>
          </Text>
          <Text>
            Builder: <strong>{builderName}</strong>
          </Text>
          <Text>Please configure the install task list to proceed.</Text>
          <br />
          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

export default JobTaskConfigureRequestEmail;
