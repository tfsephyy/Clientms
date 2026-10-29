import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, Protected } from './auth'
import { AccountStatus, AuthPage, CompleteProfile } from './pages/AuthPages'
import { Dashboard, Layout, Profile } from './pages/Layout'
import {
  Clients,
  ClientDetail,
  Pets,
  PetDetail,
  Visits,
  Corrections,
  Users,
  Activity,
} from './pages/Records'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route element={<Protected limited />}>
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/account-status" element={<AccountStatus />} />
          </Route>
          <Route element={<Protected />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="pets" element={<Pets />} />
              <Route path="pets/:id" element={<PetDetail />} />
              <Route path="visits" element={<Visits />} />
              <Route element={<Protected roles={['admin', 'staff']} />}>
                <Route path="clients" element={<Clients />} />
                <Route path="clients/:id" element={<ClientDetail />} />
              </Route>
              <Route element={<Protected roles={['admin', 'owner']} />}>
                <Route path="corrections" element={<Corrections />} />
              </Route>
              <Route element={<Protected roles={['admin']} />}>
                <Route path="users" element={<Users />} />
                <Route path="activity" element={<Activity />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
