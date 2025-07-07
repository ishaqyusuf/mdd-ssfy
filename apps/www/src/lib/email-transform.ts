export function transformEmail(subject, body, data) {
    subject = transform(subject, data);
    body = transform(body, data);

    //   console.log(subject);
    //   console.log(body);
    //   console.log(data);
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
