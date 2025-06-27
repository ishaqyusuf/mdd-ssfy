import {
    Html,
    Body,
    Container,
    Text,
    Link,
    Tailwind,
    Font,
    Preview,
    Head,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva("", {
    variants: {
        heading: {
            true: "text-[#121212] text-[21px] font-normal text-center p-0 my-[30px] mx-0",
        },
    },
});
const RenderLine = ({ line }) => {
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
                                <td
                                    className={cn(variants(line.tdStyle))}
                                    key={rId}
                                >
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

const RenderStack = ({ stack }) => {
    return (
        <>
            {stack.lines.map((line, index) => (
                <RenderLine key={index} line={line} />
            ))}
        </>
    );
};
export const composeEmailTemplate = (props: { emailStack; preview }) => (
    <EmailTemplate {...props} />
);
export const EmailTemplate = ({ emailStack, preview }) => {
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
                <Body className="bg-[#fff] my-auto mx-auto font-sans">
                    <Container
                        className="border-transparent md:border-[#E8E7E1] my-[40px] mx-auto p-[20px] max-w-[600px]"
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
