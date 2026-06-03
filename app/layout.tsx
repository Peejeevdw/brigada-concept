import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { Providers } from "./providers";
import { DraftModeBanner } from "@/components/DraftModeBanner";
import { SiteChromeProvider } from "@/lib/site-chrome";
import { getChrome } from "@/lib/sanity-fetch";
import "@/index.css";

export const metadata: Metadata = {
  title: "Brigada",
  description: "We cut through the noise to set brands in motion across everything they do.",
  openGraph: {
    type: "website",
    title: "Brigada",
    description: "We cut through the noise to set brands in motion across everything they do.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brigada",
    description: "We cut through the noise to set brands in motion across everything they do.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [isDraft, chrome] = await Promise.all([
    draftMode().then((dm) => dm.isEnabled),
    getChrome(),
  ]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteChromeProvider value={chrome}>
          <Providers>{children}</Providers>
        </SiteChromeProvider>
        {isDraft && <DraftModeBanner />}
      </body>
    </html>
  );
}
