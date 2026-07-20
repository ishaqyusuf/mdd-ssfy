import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ productSlug: string }>;
}
export default async function Page(props: Props) {
  const params = await props.params;
  redirect(`/products/${params.productSlug}`);
}
