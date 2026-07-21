import Link from "next/link";

export function PreHeader() {
  return (
    <div className="bg-primary text-primary-foreground text-xs py-2">
      <div className="container flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>13285 SW 131th St Miami, FL 33186</span>
          <span>•</span>
          <span>Open Mon – Fri 7:30 am-4:30 pm Sat & Sun CLOSED</span>
          <span>•</span>
          <span>(305) 278-6555</span>
        </div>
        <div>
          <Link href="#" className="hover:underline">
            Account Login
          </Link>
        </div>
      </div>
    </div>
  );
}
