import SearchPageClient from "@/components/search-page-client";
import { SearchParams } from "nuqs";

interface Props {
  searchParams: Promise<SearchParams>;
}
export default async function Page(props: Props) {
  const searchParams = await props.searchParams;

  return (
    <div className="min-h-screen bg-background">
      <SearchPageClient />
    </div>
  );
}
