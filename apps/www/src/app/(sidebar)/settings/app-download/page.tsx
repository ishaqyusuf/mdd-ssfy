import PageShell from "@/components/page-shell";
import { AppDownloadSettingsPage } from "@/components/settings/app-download-settings-page";

export default function Page() {
  return (
    <PageShell>
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <AppDownloadSettingsPage />
      </div>
    </PageShell>
  );
}
