import { Button } from "@gnd/ui/button";
import { Download } from "lucide-react";

export function AppDownloadSupportPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Button asChild size="lg">
        <a href="/api/download-app" aria-label="Download GND mobile app">
          <Download aria-hidden="true" className="mr-2 size-4" />
          Download Mobile App
        </a>
      </Button>
    </div>
  );
}
