import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { API, api, dateTime } from '../api'
import { useAuth } from '../auth'
import {
  Badge,
  Brand,
  Empty,
  ErrorMessage,
  Field,
  MutationForm,
  PageTitle,
  Paw,
  Textarea,
  useRecords,
} from '../components'
import { SignOut } from './AuthPages'

const roleNames = {
  admin: 'Administrator',
  staff: 'Clinic Staff',
  owner: 'Pet Owner',
}
const navigation = [
  ['/', 'Overview', '▦', ['admin', 'staff', 'owner']],
  ['/clients', 'Clients', '♧', ['admin', 'staff']],
  ['/pets', 'Pets', '♡', ['admin', 'staff', 'owner']],
  ['/visits', 'Visit history', '◷', ['admin', 'staff', 'owner']],
  ['/corrections', 'Correction requests', '✎', ['admin', 'owner']],
  ['/users', 'Users & approvals', '◎', ['admin']],
  ['/activity', 'Activity log', '☷', ['admin']],
]

export function Layout() {
  const { user, logout } = useAuth()
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  return (
    <div className="app-layout">
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Brand />
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation
            .filter(([, , , roles]) => roles.includes(user.role))
            .map(([path, label, icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                onClick={() => setMenu(false)}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-note">
          <Paw size={24} />
          <strong>A little care goes a long way.</strong>
          <p>All the people and pets that make your clinic a community.</p>
        </div>
        <div className="sidebar-bottom">
          <NavLink to="/profile" onClick={() => setMenu(false)}>
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{roleNames[user.role]}</small>
            </span>
            <span>↗</span>
          </NavLink>
          <SignOut logout={logout} />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="menu-toggle secondary"
            aria-expanded={menu}
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <div className="breadcrumbs">
            <span>PetFave</span>
            <span>/</span>
            <strong>
              {navigation.find(([path]) =>
                path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path),
              )?.[1] || 'My profile'}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="today">
              {new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <Badge>{roleNames[user.role]}</Badge>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>PetFave · Keeping care connected</span>
          <span>Client Management System</span>
        </footer>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const pets = useRecords('pets')
  const visits = useRecords('visits')
  const clients = useRecords(
    user.role === 'admin'
      ? 'users'
      : user.role === 'staff'
        ? 'clients'
        : 'corrections',
    { status: user.role === 'admin' ? 'pending' : '' },
  )
  const total = (state) =>
    state.loading
      ? '…'
      : state.error
        ? '—'
        : (state.result?.total ?? state.result?.meta?.total ?? 0)
  const cards = [
    [
      total(pets),
      user.role === 'owner' ? 'My registered pets' : 'Registered pets',
      '♡',
      '/pets',
      'lavender',
    ],
    [total(visits), 'Clinic visits', '◷', '/visits', 'peach'],
    [
      total(clients),
      user.role === 'admin'
        ? 'Pending approvals'
        : user.role === 'staff'
          ? 'Active clients'
          : 'Correction requests',
      '♧',
      user.role === 'admin'
        ? '/users'
        : user.role === 'staff'
          ? '/clients'
          : '/corrections',
      'mint',
    ],
  ]
  return (
    <>
      <PageTitle
        title={`Hello, ${user.name.split(' ')[0]}.`}
        description="A little overview of your PetFave community."
      />
      <div className="welcome-banner">
        <div>
          <span className="pill">EVERY DETAIL MATTERS</span>
          <h2>
            {user.role === 'owner'
              ? 'Their little world, all in one place.'
              : 'Good care starts with connection.'}
          </h2>
          <p>
            {user.role === 'owner'
              ? 'Keep your details up to date, get to know your pet’s history, and stay connected to your clinic.'
              : 'Keep people, pets, and their visits organized. More time for the relationships that matter.'}
          </p>
          <Link
            className="button dark"
            to={user.role === 'owner' ? '/pets' : '/clients'}
          >
            {user.role === 'owner' ? 'Meet my pets' : 'Explore clients'}{' '}
            <span>↗</span>
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="paw-orbit">
            <Paw size={92} />
          </div>
          <span className="art-heart">♡</span>
          <span className="art-star">✧</span>
        </div>
      </div>
      <div className="stats-grid">
        {cards.map(([value, label, icon, path, color]) => (
          <Link className="stat-card" key={label} to={path}>
            <div>
              <span className={`stat-icon ${color}`}>{icon}</span>
              <span className="stat-arrow">↗</span>
            </div>
            <strong>{value}</strong>
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <ErrorMessage error={pets.error || visits.error || clients.error} />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Recent visits</h2>
              <p>A look at the latest clinic check-ins.</p>
            </div>
            <Link to="/visits">View all ↗</Link>
          </div>
          {visits.loading ? (
            <p className="loading">Loading visits…</p>
          ) : !visits.data.length ? (
            <Empty
              title="A fresh start"
              text="Clinic visits will appear here as they are recorded."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pet</th>
                    <th>Visit</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.data.slice(0, 5).map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        <Link to={`/pets/${visit.pet_id}`}>
                          <strong>{visit.pet?.name}</strong>
                        </Link>
                        <small>{visit.pet?.client?.name}</small>
                      </td>
                      <td>{visit.purpose}</td>
                      <td>{dateTime(visit.visited_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel quick-links">
          <div className="section-head">
            <div>
              <h2>A good place to start</h2>
              <p>Make room for a little more care.</p>
            </div>
          </div>
          <Link to="/pets">
            <span className="link-icon lavender">
              <Paw size={20} />
            </span>
            <div>
              <strong>
                {user.role === 'owner' ? 'My pets' : 'Pet directory'}
              </strong>
              <small>Meet the pets in your care</small>
            </div>
            <span>→</span>
          </Link>
          <Link to="/profile">
            <span className="link-icon peach">♧</span>
            <div>
              <strong>My contact details</strong>
              <small>Keep your information current</small>
            </div>
            <span>→</span>
          </Link>
          <Link
            to={
              user.role === 'admin'
                ? '/users'
                : user.role === 'owner'
                  ? '/corrections'
                  : '/visits'
            }
          >
            <span className="link-icon mint">✎</span>
            <div>
              <strong>
                {user.role === 'admin'
                  ? 'Staff applications'
                  : user.role === 'owner'
                    ? 'Request a correction'
                    : 'Record a visit'}
              </strong>
              <small>
                {user.role === 'admin'
                  ? 'Help your team get started'
                  : user.role === 'owner'
                    ? 'Help us keep records accurate'
                    : 'Add a new clinic check-in'}
              </small>
            </div>
            <span>→</span>
          </Link>
        </section>
      </div>
    </>
  )
}

export function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    name: user.name,
    contact_number: user.contact_number || '',
    address: user.address || '',
  })
  const [saved, setSaved] = useState(false)
  const set = (key) => (event) => {
    setSaved(false)
    setForm({ ...form, [key]: event.target.value })
  }
  return (
    <>
      <PageTitle
        title="My profile"
        description="The details that keep you connected to your clinic."
      />
      <section className="panel profile-panel">
        <div className="profile-heading">
          <span className="avatar large">{user.name.slice(0, 1)}</span>
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <Badge>{roleNames[user.role]}</Badge>
        </div>
        {saved && (
          <div className="success" role="status">
            Your profile has been updated.
          </div>
        )}
        <MutationForm
          onSubmit={() => api(`${API}/profile`, { method: 'PUT', body: form })}
          onDone={(result) => {
            setUser(result.data)
            setSaved(true)
          }}
        >
          <Field
            label="Full name"
            required
            maxLength={255}
            value={form.name}
            onChange={set('name')}
          />
          <Field
            label="Contact number"
            type="tel"
            required
            maxLength={30}
            value={form.contact_number}
            onChange={set('contact_number')}
          />
          <Textarea
            label="Address"
            required
            maxLength={2000}
            value={form.address}
            onChange={set('address')}
          />
        </MutationForm>
      </section>
    </>
  )
}
