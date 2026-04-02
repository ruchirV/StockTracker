import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/authApi'

export function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const accessToken = params.get('accessToken')
    const oauthError = params.get('error')

    if (oauthError || !accessToken) {
      navigate('/login?error=oauth', { replace: true })
      return
    }

    // Store the access token, then fetch user profile
    useAuthStore.getState().setAccessToken(accessToken)
    authApi
      .me()
      .then((user) => {
        setAuth(user, accessToken)
        // Clean up tokens from URL before redirecting
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        navigate('/login?error=oauth', { replace: true })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
        role="status"
        aria-label="Completing sign in"
      />
    </div>
  )
}
