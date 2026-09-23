import type { Metadata, Viewport } from "next";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export const metadata: Metadata = {
  title: {
    default: "CareerQuest",
    template: "%s | CareerQuest",
  },
  description: "次のキャリアへ、今日の一歩。個人用の転職準備タスク管理アプリ。",
  applicationName: "CareerQuest",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CareerQuest",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4b42",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
