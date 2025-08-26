import { RouterOutputs } from "@api/trpc/routers/_app";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gnd/ui/card";
import Image from "next/image";
import Link from "next/link";

type Category = RouterOutputs["storefront"]["getPrimaryCategories"][number];
interface CategoryCardProps extends Category {}

export function CategoryCard1({
  count,
  img,
  path,
  slug,
  title,
  description,
}: CategoryCardProps) {
  return (
    <Link href={path}>
      <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader className="p-0">
          <div className="relative overflow-hidden rounded-t-lg">
            {!img || (
              <Image
                src={img || "/placeholder.svg"}
                alt={title}
                fill
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <CardTitle className="text-xl mb-2">{title}</CardTitle>
          <CardDescription className="mb-3">{description}</CardDescription>
          <p className="text-sm font-medium text-amber-700">{count}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
