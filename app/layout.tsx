import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Script from "next/script";
import { Providers } from "./providers";
import { DraftModeBanner } from "@/components/DraftModeBanner";
import Preloader from "@/components/Preloader";
import SmallScreenNotice from "@/components/SmallScreenNotice";
import UserbackWidget from "@/components/UserbackWidget";
import { SiteChromeProvider } from "@/lib/site-chrome";
import { getChrome } from "@/lib/sanity-fetch";
import "@/index.css";

const GTM_ID = "GTM-59KTNVKX";

export const metadata: Metadata = {
  title: "Brigada",
  description: "We cut through the noise to set brands in motion across everything they do.",
  // Pre-launch: tell search engines and AI crawlers not to index the site.
  // Drop this `robots` block to make it discoverable.
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
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
              // Hide the intro overlay before first paint when the intro already
              // played this session, OR when landing directly on an "X is now
              // Brigada" agency page (e.g. /today) — there you must see the old
              // logo first, not the Brigada wordmark. Agency routes intentionally
              // do NOT set the session key, so the intro can still play elsewhere.
              "try{var p=location.pathname.replace(/^\\/+|\\/+$/g,'');if(sessionStorage.getItem('brigada-preloaded')||['today'].indexOf(p)>-1)document.documentElement.classList.add('preloaded')}catch(e){}",
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
        {/* Cookie-Script consent banner. Auto-shows on first visit until
            consent is recorded; auto-wires any element with id="csconsentlink"
            (like the "Cookies" link in the footer) to re-open the banner. */}
        <Script
          id="cookie-script"
          src="https://cdn.cookie-script.com/s/15b92958166470230dd3c72185b67909.js"
          strategy="afterInteractive"
        />
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
        {/* Feedback widget — only loads when a visitor opens any page with
            `?feedback=on` (the flag persists for the session). Stays invisible
            for normal visitors so it doesn't need to be removed at launch. */}
        <UserbackWidget />
        {isDraft && <DraftModeBanner />}
      </body>
    </html>
  );
}
