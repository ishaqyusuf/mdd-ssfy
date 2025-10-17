import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary dark:text-muted-foreground dark:hover:text-primary-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                {item.label}
              </span>
            )}
            {index < items.length - 1 && (
              <ChevronRight className="rtl:rotate-180 w-4 h-4 text-muted-foreground mx-1" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
