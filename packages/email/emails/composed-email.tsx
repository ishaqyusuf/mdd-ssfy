/** @jsxImportSource react */
import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Link,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";
import { cva } from "class-variance-authority";

import { cn } from "@gnd/ui/cn";

import { Footer } from "../components/footer";
import { Logo } from "../components/logo";

type EmailLineStyle = {
  heading?: boolean;
};

type EmailTextLine = {
  type: "text";
  text: string;
  style?: EmailLineStyle;
};

type EmailLinkLine = {
  type: "link";
  href: string;
  text: string;
  style?: EmailLineStyle;
};

type EmailTableLine = {
  type: "table";
  lines: EmailLine[][];
  style?: EmailLineStyle;
  bodyStyle?: EmailLineStyle;
  trStyle?: EmailLineStyle;
  tdStyle?: EmailLineStyle;
};

type EmailLine = EmailTextLine | EmailLinkLine | EmailTableLine;
type EmailStack = {
  lines: EmailLine[];
};

type ComposedEmailTemplateProps = {
  emailStack: EmailStack;
  preview: string;
};

const variants = cva("", {
  variants: {
    heading: {
      true: "text-[#121212] text-[21px] font-normal text-center p-0 my-[30px] mx-0",
    },
  },
});
const RenderLine = ({ line }: { line: EmailLine }) => {
  const style = cn(variants(line.style));
  if (line.type === "text") {
    return <Text className={style}>{line.text}</Text>;
  }
  if (line.type === "link") {
    return (
      <Link href={line.href} className={style}>
        {line.text}
      </Link>
    );
  }
  if (line.type === "table") {
    return (
      <table className={style}>
        <tbody className={cn(variants(line.bodyStyle))}>
          {line.lines.map((rows, index) => (
            <tr className={cn(variants(line.trStyle))} key={index}>
              {rows?.map((row, rId) => (
                <td className={cn(variants(line.tdStyle))} key={rId}>
                  <RenderLine line={row} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return null;
};

const RenderStack = ({ stack }: { stack: EmailStack }) => {
  return (
    <>
      {stack.lines.map((line, index) => (
        <RenderLine key={index} line={line} />
      ))}
    </>
  );
};
export const composeEmailTemplate = (props: ComposedEmailTemplateProps) => (
  <EmailTemplate {...props} />
);
export const EmailTemplate = ({
  emailStack,
  preview,
}: ComposedEmailTemplateProps) => {
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
        <Preview>{preview}</Preview>
        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: "solid", borderWidth: 1 }}
          >
            <Logo />
            <RenderStack stack={emailStack} /> <br />
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailTemplate;
