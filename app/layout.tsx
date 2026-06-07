import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Script from "next/script";
import { Providers } from "./providers";
import { DraftModeBanner } from "@/components/DraftModeBanner";
import Preloader from "@/components/Preloader";
import SmallScreenNotice from "@/components/SmallScreenNotice";
import { SiteChromeProvider } from "@/lib/site-chrome";
import { getChrome } from "@/lib/sanity-fetch";
import "@/index.css";

const GTM_ID = "GTM-59KTNVKX";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No-flash preloader gate: runs before first paint. If the intro
            already played this session, mark <html> so CSS hides the overlay
            instantly — otherwise a full page load (e.g. a direct visit) would
            briefly re-show the blurred wordmark before React can hide it. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('brigada-preloaded'))document.documentElement.classList.add('preloaded')}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        {/* Google Tag Manager */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body>
        {/* Google Tag Manager (noscript) — keeps GTM functional for users
            without JS. Has to be raw markup at the top of <body>. */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <SiteChromeProvider value={chrome}>
          <Providers>{children}</Providers>
        </SiteChromeProvider>
        <Preloader />
        {/* Production only — keeps visitors gated below 1240px while mobile is
            still in progress, but doesn't block local mobile development. */}
        {process.env.NODE_ENV === "production" && <SmallScreenNotice />}
        {isDraft && <DraftModeBanner />}
      </body>
    </html>
  );
}
