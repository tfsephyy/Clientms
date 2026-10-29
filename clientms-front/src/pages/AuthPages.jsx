import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { API, API_ORIGIN, api } from '../api'
import { accountHome, useAuth } from '../auth'
import {
  Brand,
  ErrorMessage,
  Field,
  MutationForm,
  Paw,
  Textarea,
} from '../components'

const googleErrors = {
  google_not_configured:
    'Google sign-in is not available yet. Please use email and password or contact the clinic administrator.',
  google_failed: 'Google sign-in could not be completed. Please try again.',
  google_unverified: 'Google did not return a verified email address.',
  account_exists:
    'An account already uses this email. Please sign in with your password.',
  choose_role: 'Choose Pet Owner or Clinic Staff to register with Google.',
}

export function AuthPage({ register = false }) {
  const { user, loading, authenticate } = useAuth()
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    contact_number: '',
    address: '',
    role: 'owner',
  })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value })
  if (loading)
    return <div className="screen-message">Connecting to PetFave…</div>
  if (user) return <Navigate to={accountHome(user)} replace />
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div className="story-content">
          <span className="pill">
            A LITTLE MORE CARE. A LOT MORE CONNECTION.
          </span>
          <h1>
            Every pet has a person.
            <br />
            <em>Keep them connected.</em>
          </h1>
          <p>
            A thoughtful space for pet owners and clinic teams to stay
            organized, keep in touch, and care for the details.
          </p>
          <div className="story-paw">
            <Paw size={110} />
            <span>People. Pets. All together.</span>
          </div>
        </div>
        <small>PetFave · Client Management System</small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="eyebrow">WELCOME TO PETFAVE</div>
          <h1>
            {register
              ? 'A place for you & your pets.'
              : 'Good to see you again.'}
          </h1>
          <p>
            {register
              ? 'Create your account to get started.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <ErrorMessage
            error={
              error ||
              (params.get('error')
                ? {
                    message:
                      googleErrors[params.get('error')] || 'Sign-in failed.',
                  }
                : null)
            }
          />
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              setError(null)
              setBusy(true)
              try {
                await authenticate(
                  register ? 'register' : 'login',
                  register
                    ? form
                    : {
                        email: form.email.trim().toLowerCase(),
                        password: form.password,
                      },
                )
              } catch (error) {
                setError(error)
              } finally {
                setBusy(false)
              }
            }}
          >
            <fieldset disabled={busy}>
              {register && (
                <>
                  <div className="role-choice">
                    <button
                      type="button"
                      className={form.role === 'owner' ? 'selected' : ''}
                      onClick={() => setForm({ ...form, role: 'owner' })}
                    >
                      <Paw size={22} /> Pet Owner<small>Manage your pets</small>
                    </button>
                    <button
                      type="button"
                      className={form.role === 'staff' ? 'selected' : ''}
                      onClick={() => setForm({ ...form, role: 'staff' })}
                    >
                      ♡ Clinic Staff
                      <small>Administrator approval required</small>
                    </button>
                  </div>
                  <Field
                    label="Full name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={set('name')}
                    maxLength={255}
                  />
                </>
              )}
              <Field
                label="Email address"
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value.toLowerCase() })
                }
                maxLength={255}
              />
              {register && (
                <>
                  <Field
                    label="Contact number"
                    required
                    type="tel"
                    autoComplete="tel"
                    value={form.contact_number}
                    onChange={set('contact_number')}
                    maxLength={30}
                  />
                  <Textarea
                    label="Address"
                    required
                    autoComplete="street-address"
                    value={form.address}
                    onChange={set('address')}
                    maxLength={2000}
                  />
                </>
              )}
              <div className={register ? 'form-grid' : ''}>
                <Field
                  label="Password"
                  required
                  type="password"
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={register ? 8 : undefined}
                  value={form.password}
                  onChange={set('password')}
                />
                {register && (
                  <Field
                    label="Confirm password"
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={form.password_confirmation}
                    onChange={set('password_confirmation')}
                  />
                )}
              </div>
              <button className="full" type="submit" disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : register
                    ? 'Create account →'
                    : 'Sign in →'}
              </button>
            </fieldset>
          </form>
          <div className="divider">
            <span>or continue with</span>
          </div>
          <a
            className="google-button"
            href={`${API_ORIGIN}/auth/google/redirect${register ? `?role=${form.role}` : ''}`}
          >
            <strong>G</strong> Google
          </a>
          <p className="auth-switch">
            {register ? 'Already part of PetFave?' : 'New to PetFave?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          {register && (
            <p className="fine-print">
              Pet owner accounts are active immediately. Staff accounts require
              approval before accessing clinic records.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export function CompleteProfile() {
  const { user, setUser, logout } = useAuth()
  const [form, setForm] = useState({
    name: user.name,
    contact_number: user.contact_number || '',
    address: user.address || '',
  })
  if (user.profile_complete) return <Navigate to={accountHome(user)} replace />
  return (
    <div className="standalone">
      <Brand />
      <div className="panel narrow">
        <div className="eyebrow">ONE LAST STEP</div>
        <h1>Make yourself at home.</h1>
        <p>
          Complete your contact information to finish setting up your account.
        </p>
        <MutationForm
          onSubmit={() => api(`${API}/profile`, { method: 'PUT', body: form })}
          onDone={(result) => setUser(result.data)}
          submitLabel="Complete profile"
        >
          <Field
            label="Full name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            maxLength={255}
          />
          <Field
            label="Contact number"
            type="tel"
            required
            value={form.contact_number}
            onChange={(event) =>
              setForm({ ...form, contact_number: event.target.value })
            }
            maxLength={30}
          />
          <Textarea
            label="Address"
            required
            value={form.address}
            onChange={(event) =>
              setForm({ ...form, address: event.target.value })
            }
            maxLength={2000}
          />
        </MutationForm>
        <SignOut logout={logout} />
      </div>
    </div>
  )
}

export function SignOut({ logout }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <ErrorMessage error={error} />
      <button
        className="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await logout()
          } catch (error) {
            setError(error)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  )
}

export function AccountStatus() {
  const { user, refresh, logout } = useAuth()
  const [checking, setChecking] = useState(false)
  if (accountHome(user) !== '/account-status')
    return <Navigate to={accountHome(user)} replace />
  const pending = user.approval_status === 'pending'
  return (
    <div className="standalone">
      <Brand />
      <div className="panel narrow status-card">
        <span className="empty-icon">{pending ? '◷' : '♡'}</span>
        <div className="eyebrow">
          {user.archived
            ? 'ARCHIVED ACCOUNT'
            : `${user.approval_status.toUpperCase()} APPLICATION`}
        </div>
        <h1>
          {user.archived
            ? 'Please contact the clinic.'
            : pending
              ? 'You’re on the list.'
              : 'Your application was not approved.'}
        </h1>
        <p>
          {user.archived
            ? 'Your client record has been archived by the clinic.'
            : pending
              ? 'An administrator will review your staff registration. Clinic records will be available once you are approved.'
              : 'Please contact the clinic administrator for more information.'}
        </p>
        <p className="muted">Signed in as {user.email}</p>
        <div className="inline-actions">
          <button
            disabled={checking}
            onClick={async () => {
              setChecking(true)
              await refresh()
              setChecking(false)
            }}
          >
            {checking ? 'Checking…' : 'Check status'}
          </button>
          <SignOut logout={logout} />
        </div>
      </div>
    </div>
  )
}
