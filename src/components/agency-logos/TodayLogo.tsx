import type { SVGProps } from "react";

// "Today" wordmark — original agency logo, redrawn to inherit `currentColor`
// (the source export was hardcoded white) so it can be tinted by its container.
const TodayLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 141 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Today"
    {...props}
  >
    <path d="M8.227 5.4H0V0h25.681v5.4h-8.226V23.25H8.227zm18.098 5.08c0-4.721 1.43-8.227 4.292-10.48h22.534c2.861 2.253 4.292 5.759 4.292 10.48 0 8.942-5.115 13.52-15.56 13.52-10.443 0-15.558-4.578-15.558-13.52m15.559 6.009c3.47 0 5.687-1.789 5.687-6.01 0-4.22-2.218-6.008-5.687-6.008s-5.687 1.788-5.687 6.009c0 4.22 2.217 6.009 5.687 6.009M59.48 0h23.893c2.719 1.931 4.113 5.258 4.113 10.48 0 9.621-4.72 12.769-13.806 12.769h-14.2zm11.983 16.095c4.399 0 6.152-1.323 6.152-5.615s-1.753-5.616-6.152-5.616H68.71v11.231zM95.356 0h13.771l9.192 23.249h-9.764l-1.217-3.398H97.002l-1.216 3.398h-9.622zm9.801 13.699-2.933-8.155h-.179l-2.897 8.155zm17.311 1.145L113.169 0h10.05l3.935 7.19L131.052 0h9.944l-9.3 14.844v8.405h-9.228z" />
  </svg>
);

export default TodayLogo;
