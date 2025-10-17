import { Section, Heading, Text, Button } from "@react-email/components";
import { getEmailThemeClasses, getEmailInlineStyles } from "./theme";

interface Props {
  getStartedLink?: string;
  headline?: string;
  bodyText?: string;
  buttonText?: string;
}

export function StoreFrontAd({
  getStartedLink = "https://gndprodesk.com/shop",
  headline = "Introducing Our New Online Storefront!",
  bodyText = "You can now place and manage your orders online, access exclusive deals, and enjoy a seamless ordering experience. Get started today!",
  buttonText = "Explore the Storefront",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  return <></>;
  return (
    <Section
      className="w-full mt-[30px] pt-[20px] border-t border-solid"
      style={{ borderColor: lightStyles.container.borderColor }}
    >
      <Heading
        as="h2"
        className={`text-[20px] font-normal text-center p-0 my-[20px] mx-0 ${themeClasses.heading}`}
        style={{ color: lightStyles.text.color }}
      >
        {headline}
      </Heading>
      <Text
        className={`text-center ${themeClasses.text}`}
        style={{ color: lightStyles.text.color, padding: "0 20px" }}
      >
        {bodyText}
      </Text>
      <Section className="text-center mt-[20px] mb-[30px]">
        <Button href={getStartedLink}>{buttonText}</Button>
      </Section>
    </Section>
  );
}
