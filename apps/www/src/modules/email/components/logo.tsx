import { getBaseUrl } from "@/envs";
import { Img, Section } from "@react-email/components";

const baseUrl = getBaseUrl();

export function Logo() {
    return (
        <Section className="mt-[32px]">
            <Img
                src={`${baseUrl}/email/logo.png`}
                width="45"
                height="45"
                alt="GndMillwork"
                className="my-0 mx-auto block"
            />
        </Section>
    );
}
