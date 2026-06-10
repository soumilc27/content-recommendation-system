/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '')
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_API_URL ||;

fetch(`${API_URL}/api/v1/your-endpoint`);
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
