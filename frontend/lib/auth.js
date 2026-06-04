export function getToken() {
  try {
    return localStorage.getItem('cm_token')
  } catch (e) {
    return null
  }
}

export function authFetch(url, options={}){
  const token = getToken()
  const headers = options.headers || {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}
