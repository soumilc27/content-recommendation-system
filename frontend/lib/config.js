let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
if (!baseUrl.endsWith('/api/v1')) {
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  if (!baseUrl.endsWith('/api/v1')) {
    baseUrl = `${baseUrl}/api/v1`
  }
}
export const API_BASE = baseUrl

