import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { API, api, csrf } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const refresh = useCallback(async () => {
    try {
      const result = await api(`${API}/me`)
      setUser(result.data)
      setError(null)
    } catch (error) {
      if (error.status === 401) setUser(null)
      else setError(error)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    refresh()
    const expired = () => setUser(null)
    window.addEventListener('petfave:expired', expired)
    window.addEventListener('petfave:permissions', refresh)
    return () => {
      window.removeEventListener('petfave:expired', expired)
      window.removeEventListener('petfave:permissions', refresh)
    }
  }, [refresh])

  const authenticate = async (action, body) => {
    await csrf()
    const result = await api(`/api/auth/${action}`, { method: 'POST', body })
    setUser(result.data)
  }
  const logout = async () => {
    await csrf()
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, error, refresh, authenticate, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function accountHome(user) {
  if (!user.profile_complete) return '/complete-profile'
  if (user.approval_status !== 'approved' || user.archived)
    return '/account-status'
  return '/'
}

export function Protected({ roles, limited = false }) {
  const { user, loading, error, refresh } = useAuth()
  const location = useLocation()
  if (loading)
    return <div className="screen-message">Connecting to PetFave…</div>
  if (error)
    return (
      <div className="screen-message">
        <h2>Connection unavailable</h2>
        <p>{error.message}</p>
        <button onClick={refresh}>Try again</button>
      </div>
    )
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!limited && accountHome(user) !== '/')
    return <Navigate to={accountHome(user)} replace />
  if (roles && !roles.includes(user.role))
    return <Navigate to={accountHome(user)} replace />
  return <Outlet />
}
