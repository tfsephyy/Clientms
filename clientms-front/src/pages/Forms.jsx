import { useState } from 'react'
import { API, api, localDateTime } from '../api'
import { useAuth } from '../auth'
import { Field, Lookup, MutationForm, Select, Textarea } from '../components'

const sexes = [
  ['unknown', 'Unknown'],
  ['male', 'Male'],
  ['female', 'Female'],
]

export function ClientForm({ initial = {}, onDone }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    email: initial.email || '',
    contact_number: initial.contact_number || '',
    address: initial.address || '',
  })
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value })
  return (
    <MutationForm
      submitLabel={initial.id ? 'Save client' : 'Register client'}
      onDone={onDone}
      onSubmit={() =>
        api(`${API}/clients${initial.id ? `/${initial.id}` : ''}`, {
          method: initial.id ? 'PUT' : 'POST',
          body: form,
        })
      }
    >
      <Field
        label="Full name"
        required
        maxLength={255}
        value={form.name}
        onChange={set('name')}
      />
      <Field
        label="Email address"
        type="email"
        required
        maxLength={255}
        value={form.email}
        onChange={set('email')}
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
      <p className="form-note">
        This is the clinic’s client record. New owners can create a sign-in
        account through registration.
      </p>
    </MutationForm>
  )
}

export function PetForm({ initial = {}, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: initial.name || '',
    species: initial.species || '',
    breed: initial.breed || '',
    sex: initial.sex || 'unknown',
    birth_date: initial.birth_date?.slice(0, 10) || '',
    color: initial.color || '',
  })
  const [clientId, setClientId] = useState(initial.client_id || '')
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value })
  return (
    <MutationForm
      submitLabel={initial.id ? 'Save pet' : 'Register pet'}
      onDone={onDone}
      onSubmit={() =>
        api(`${API}/pets${initial.id ? `/${initial.id}` : ''}`, {
          method: initial.id ? 'PUT' : 'POST',
          body: {
            ...form,
            birth_date: form.birth_date || null,
            ...(!initial.id && user.role === 'admin'
              ? { client_id: Number(clientId) }
              : {}),
          },
        })
      }
    >
      {!initial.id && user.role === 'admin' && (
        <Lookup
          label="Client"
          path="clients"
          value={clientId}
          onChange={setClientId}
          initialLabel={initial.client?.name}
        />
      )}
      <Field
        label="Pet name"
        required
        maxLength={120}
        value={form.name}
        onChange={set('name')}
      />
      <div className="form-grid">
        <Field
          label="Species"
          required
          placeholder="e.g. Dog, Cat, Rabbit"
          maxLength={80}
          value={form.species}
          onChange={set('species')}
        />
        <Field
          label="Breed"
          maxLength={120}
          value={form.breed}
          onChange={set('breed')}
        />
        <Select
          label="Sex"
          required
          options={sexes}
          value={form.sex}
          onChange={set('sex')}
        />
        <Field
          label="Date of birth"
          type="date"
          max={localDateTime().slice(0, 10)}
          value={form.birth_date}
          onChange={set('birth_date')}
        />
      </div>
      <Field
        label="Color / markings"
        maxLength={120}
        value={form.color}
        onChange={set('color')}
      />
    </MutationForm>
  )
}

export function VisitForm({ initial = {}, onDone }) {
  const [form, setForm] = useState({
    visited_at: localDateTime(initial.visited_at),
    purpose: initial.purpose || '',
    notes: initial.notes || '',
  })
  const [petId, setPetId] = useState(initial.pet_id || '')
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value })
  return (
    <MutationForm
      submitLabel={initial.id ? 'Save visit' : 'Record visit'}
      onDone={onDone}
      onSubmit={() =>
        api(`${API}/visits${initial.id ? `/${initial.id}` : ''}`, {
          method: initial.id ? 'PUT' : 'POST',
          body: {
            ...form,
            visited_at: new Date(form.visited_at).toISOString(),
            ...(!initial.id ? { pet_id: Number(petId) } : {}),
          },
        })
      }
    >
      {!initial.id && (
        <Lookup
          label="Pet"
          path="pets"
          value={petId}
          onChange={setPetId}
          initialLabel={initial.pet?.name}
        />
      )}
      <Field
        label="Visit date & time"
        type="datetime-local"
        required
        max={localDateTime()}
        value={form.visited_at}
        onChange={set('visited_at')}
      />
      <Field
        label="Visit purpose"
        required
        placeholder="e.g. Initial registration, Follow-up visit"
        maxLength={255}
        value={form.purpose}
        onChange={set('purpose')}
      />
      <Textarea
        label="Basic visit notes"
        placeholder="Attendance, contact updates, and other non-medical visit details."
        maxLength={5000}
        value={form.notes}
        onChange={set('notes')}
      />
      <p className="form-note">
        Use this space for basic clinic visit details only.
      </p>
    </MutationForm>
  )
}

export function CorrectionForm({ initial = {}, onDone }) {
  const [type, setType] = useState(initial.visit_id ? 'visit' : 'ownership')
  const [petId, setPetId] = useState(initial.pet_id || '')
  const [visitId, setVisitId] = useState(initial.visit_id || '')
  const [description, setDescription] = useState('')
  return (
    <MutationForm
      submitLabel="Send correction request"
      onDone={onDone}
      onSubmit={() =>
        api(`${API}/corrections`, {
          method: 'POST',
          body: {
            pet_id: Number(petId),
            type,
            description,
            ...(type === 'visit' ? { visit_id: Number(visitId) } : {}),
          },
        })
      }
    >
      <Select
        label="What needs correcting?"
        options={[
          ['ownership', 'Ownership record'],
          ['visit', 'Clinic visit information'],
        ]}
        value={type}
        onChange={(event) => setType(event.target.value)}
      />
      <Lookup
        label="Pet"
        path="pets?archived=1"
        value={petId}
        initialLabel={initial.pet?.name}
        onChange={(value) => {
          setPetId(value)
          setVisitId('')
        }}
      />
      {type === 'visit' && petId && (
        <Lookup
          label="Visit"
          path={`visits?pet_id=${petId}`}
          value={visitId}
          onChange={setVisitId}
          initialLabel={initial.visit?.purpose}
        />
      )}
      <Textarea
        label="Requested correction"
        required
        minLength={10}
        maxLength={5000}
        placeholder="Describe the incorrect information and the correction you would like the clinic to make."
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <p className="form-note">
        An administrator will review your request. Your records will stay as
        they are until a correction is approved.
      </p>
    </MutationForm>
  )
}

export function ResolveForm({ initial, onDone }) {
  const [status, setStatus] = useState('approved')
  const [resolution, setResolution] = useState('')
  const [clientId, setClientId] = useState('')
  const [visit, setVisit] = useState({
    visited_at: localDateTime(initial.visit?.visited_at),
    purpose: initial.visit?.purpose || '',
    notes: initial.visit?.notes || '',
  })
  return (
    <MutationForm
      submitLabel={
        status === 'approved' ? 'Approve & apply correction' : 'Reject request'
      }
      onDone={onDone}
      onSubmit={() =>
        api(`${API}/corrections/${initial.id}/resolve`, {
          method: 'PUT',
          body: {
            status,
            resolution,
            ...(status === 'approved'
              ? initial.type === 'visit'
                ? {
                    ...visit,
                    visited_at: new Date(visit.visited_at).toISOString(),
                  }
                : { client_id: Number(clientId) }
              : {}),
          },
        })
      }
    >
      <div className="request-context">
        <strong>
          {initial.pet?.name} ·{' '}
          {initial.type === 'visit' ? 'Visit information' : 'Ownership record'}
        </strong>
        <p>{initial.description}</p>
      </div>
      <Select
        label="Decision"
        value={status}
        options={[
          ['approved', 'Approve & apply changes'],
          ['rejected', 'Reject request'],
        ]}
        onChange={(event) => setStatus(event.target.value)}
      />
      {status === 'approved' &&
        (initial.type === 'ownership' ? (
          <Lookup
            label="New owner"
            path="clients"
            value={clientId}
            onChange={setClientId}
          />
        ) : (
          <>
            <Field
              label="Corrected visit date & time"
              required
              type="datetime-local"
              max={localDateTime()}
              value={visit.visited_at}
              onChange={(event) =>
                setVisit({ ...visit, visited_at: event.target.value })
              }
            />
            <Field
              label="Corrected purpose"
              required
              maxLength={255}
              value={visit.purpose}
              onChange={(event) =>
                setVisit({ ...visit, purpose: event.target.value })
              }
            />
            <Textarea
              label="Corrected basic notes"
              maxLength={5000}
              value={visit.notes}
              onChange={(event) =>
                setVisit({ ...visit, notes: event.target.value })
              }
            />
          </>
        ))}
      <Textarea
        label="Resolution / reason"
        required
        minLength={5}
        maxLength={5000}
        value={resolution}
        onChange={(event) => setResolution(event.target.value)}
      />
    </MutationForm>
  )
}

export function UserForm({ initial, onDone }) {
  const [role, setRole] = useState(initial.role)
  const [status, setStatus] = useState(initial.approval_status)
  return (
    <MutationForm
      onDone={onDone}
      onSubmit={() =>
        api(`${API}/users/${initial.id}`, {
          method: 'PUT',
          body: { role, approval_status: status },
        })
      }
    >
      <p className="request-context">
        Manage access for <strong>{initial.name}</strong>
        <br />
        {initial.email}
      </p>
      <Select
        label="Role & permissions"
        value={role}
        options={[
          ['owner', 'Pet Owner — own records only'],
          ['staff', 'Clinic Staff — search clients & manage visits'],
          ['admin', 'Administrator — full management'],
        ]}
        onChange={(event) => {
          setRole(event.target.value)
          if (event.target.value !== 'staff' && status === 'pending')
            setStatus('approved')
        }}
      />
      <Select
        label="Approval status"
        value={status}
        options={[
          ...(role === 'staff' ? [['pending', 'Pending']] : []),
          ['approved', 'Approved'],
          ['rejected', 'Rejected / access disabled'],
        ]}
        onChange={(event) => setStatus(event.target.value)}
      />
    </MutationForm>
  )
}

export function TransferForm({ pet, onDone }) {
  const [clientId, setClientId] = useState('')
  return (
    <MutationForm
      submitLabel="Transfer ownership"
      onDone={onDone}
      onSubmit={() =>
        api(`${API}/pets/${pet.id}/ownership`, {
          method: 'POST',
          body: { client_id: Number(clientId) },
        })
      }
    >
      <p className="request-context">
        Current owner: <strong>{pet.client?.name}</strong>. The new owner will
        gain access to {pet.name}’s records and visit history.
      </p>
      <Lookup
        label="New owner"
        path="clients"
        value={clientId}
        onChange={setClientId}
      />
    </MutationForm>
  )
}

export function ArchiveForm({ path, name, onDone }) {
  return (
    <MutationForm
      submitLabel="Archive record"
      onDone={onDone}
      onSubmit={() => api(`${API}/${path}`, { method: 'DELETE' })}
    >
      <p>
        Archive <strong>{name}</strong>? The record and its history will be
        retained. It will be hidden from active record lists.
      </p>
    </MutationForm>
  )
}
