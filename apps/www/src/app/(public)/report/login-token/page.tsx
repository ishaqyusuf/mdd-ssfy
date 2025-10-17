import { destroyAuthToken } from "@/actions/destory-auth.token";

export default async function ReportLoginToken(props) {
    const token = (await props.searchParams)?.token;
    await destroyAuthToken(token);
    return <></>;
}

