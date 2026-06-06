/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow mobile/LAN testing: when the dev server is reached via its network
  // IP (e.g. from a phone) instead of localhost, Next 16 otherwise blocks the
  // cross-origin dev/RSC requests, so the page renders but never hydrates.
  // Add your machine's current LAN IP here when it changes (office vs. home).
  allowedDevOrigins: ["10.18.18.230", "192.168.68.59"],
  // TODO: re-enable strict typecheck + lint after the React 19 / Next 16
  // ref-callback and unused-import cleanup pass.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "vz-329506f6-bc3.b-cdn.net" },
      { protocol: "https", hostname: "pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev" },
    ],
  },
  async redirects() {
    return [
      { source: "/concept", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Allow Sanity Studio's Presentation tool to embed the site in an
        // iframe so editors can click through stega-encoded text directly to
        // its Studio field. Anywhere else, framing stays disabled.
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://brigada.sanity.studio https://*.sanity.studio https://brigada.be",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
