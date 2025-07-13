import { Body, Preview } from "@react-email/components";
import { EmailThemeProvider } from "components/theme";

interface Props {
  isQuote?: boolean;
}

export const SalesEmail = (props: Props) => {
  const text = `You've Received ${
    props.isQuote ? "a quote" : "an Invoice"
  } from GND Millwork 
        `;
  return (
    <EmailThemeProvider preview={<Preview>{text}</Preview>}>
      <Body className={``}></Body>
    </EmailThemeProvider>
  );
};
