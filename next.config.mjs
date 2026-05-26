/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Prevent webpack from bundling these server-only packages.
  // @react-pdf/renderer uses Node.js APIs and must run outside the browser bundle.
  // Next.js 14 uses experimental.serverComponentsExternalPackages; this moves
  // to serverExternalPackages in Next.js 15.
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },

  // Strict CSP / security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default config
