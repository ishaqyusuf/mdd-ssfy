import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gnd/ui/card";
import Link from "next/link";

interface CategoryCardProps {
  name: string;
  image: string;
  description: string;
  count: string;
  href: string;
}

export function CategoryCard({
  name,
  image,
  description,
  count,
  href,
}: CategoryCardProps) {
  return (
    <Link href={href}>
      <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader className="p-0">
          <div className="relative overflow-hidden rounded-t-lg">
            <img
              src={image || "/placeholder.svg"}
              alt={name}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <CardTitle className="text-xl mb-2">{name}</CardTitle>
          <CardDescription className="mb-3">{description}</CardDescription>
          <p className="text-sm font-medium text-amber-700">{count}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
