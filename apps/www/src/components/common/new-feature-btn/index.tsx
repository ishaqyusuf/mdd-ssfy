import { Button } from "@gnd/ui/button";

import "./style.css";

import Link from "@/components/link";

interface Props {
    href?: string;
    children;
}

export default function NewFeatureBtn({ children, href }: Props) {
    return (
        <Button
            asChild
            // variant="ghost"
            size="sm"
            className="gradient-border relative  h-8   overflow-hidden rounded-lg"
        >
            <Link href={href} className="">
                {children}
            </Link>
        </Button>
    );
}
