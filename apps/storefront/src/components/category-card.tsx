import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@gnd/ui/card";
import { Button } from "@gnd/ui/button";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    slug: string;
  };
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-transform duration-300 ease-in-out hover:-translate-y-2">
      <Link
        href={`/search?category=${category.slug}`}
        className="absolute inset-0 z-10"
        prefetch={false}
      >
        <span className="sr-only">View {category.name}</span>
      </Link>
      <Image
        src={category.imageUrl || "/placeholder.svg"}
        alt={category.name}
        width={400}
        height={300}
        className="w-full h-48 object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
      />
      <CardContent className="p-4 bg-white dark:bg-gray-950">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">
          {category.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {category.description}
        </p>
        <Button variant="outline" className="w-full bg-transparent">
          Shop {category.name}
        </Button>
      </CardContent>
    </Card>
  );
}
