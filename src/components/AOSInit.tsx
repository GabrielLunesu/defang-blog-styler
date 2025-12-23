"use client";

import Script from "next/script";

export default function AOSInit() {
  return (
    <Script
      src="https://unpkg.com/aos@2.3.1/dist/aos.js"
      strategy="afterInteractive"
      onLoad={() => {
        // @ts-expect-error - AOS is loaded from CDN
        window.AOS?.init({
          duration: 600,
          once: true,
        });
      }}
    />
  );
}
