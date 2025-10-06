// next.config.js - Add security headers
/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "https://auth.urstruly.xyz/api/auth/:path*",
      },
    ];
  },
};
