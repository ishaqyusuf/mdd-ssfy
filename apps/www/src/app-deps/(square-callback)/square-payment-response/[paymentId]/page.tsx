import SquareCallback from "@/components/square-callback";

export default async function SquarePaymentResponse(props) {
    const params = await props.params;
    return <SquareCallback params={params} />;
}

