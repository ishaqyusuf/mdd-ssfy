import { redirect } from "next/navigation";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function Page(props: Props) {
	const { id } = await props.params;
	redirect(`/sales-book/top-selling-products?productId=${id}`);
}
