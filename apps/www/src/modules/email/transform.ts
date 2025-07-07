import { EmailProps } from "./send";

export function transformEmail(props: EmailProps) {
    let { subject, data, body } = props;
    subject = transform(subject, data);
    body = transform(body, data);
    return { subject, body };
}
const transform = (template, data) =>
    template?.replace(/@([a-zA-Z0-9._-]+)/g, (match, key) => {
        const keys = key.split(".");
        let value = data || {};

        for (const k of keys) {
            if (value && value.hasOwnProperty(k)) {
                value = value[k];
            } else {
                value = match; // Keep the original placeholder if key not found
                break;
            }
        }

        return value;
    });
