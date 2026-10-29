import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { API, api } from './api'

export function Paw({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <ellipse cx="8" cy="11" rx="3.5" ry="5" transform="rotate(-25 8 11)" />
      <ellipse cx="15" cy="7" rx="3.5" ry="5" />
      <ellipse cx="23" cy="9" rx="3.5" ry="5" transform="rotate(20 23 9)" />
      <ellipse cx="27" cy="17" rx="3" ry="4.5" transform="rotate(35 27 17)" />
      <path d="M7 24c0-5 5-10 9-10s10 5 10 10c0 6-7 2-10 2s-9 4-9-2Z" />
    </svg>
  )
}

export function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-icon">
        <Paw />
      </span>
      <span>
        PetFave<small>CLIENT MANAGEMENT</small>
      </span>
    </Link>
  )
}

export function ErrorMessage({ error }) {
  if (!error) return null
  return (
    <div className="error" role="alert">
      <strong>{error.message}</strong>
      {Object.entries(error.errors || {}).map(([key, messages]) => (
        <div key={key}>{messages.join(' ')}</div>
      ))}
    </div>
  )
}

export function Field({ label, children, ...props }) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required && ' *'}
      </span>
      {children ? (
        <span id={id}>{children}</span>
      ) : (
        <input id={id} {...props} />
      )}
    </label>
  )
}

export function Select({ label, options, ...props }) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required && ' *'}
      </span>
      <select id={id} {...props}>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Textarea({ label, ...props }) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required && ' *'}
      </span>
      <textarea id={id} rows={3} {...props} />
    </label>
  )
}

export function Badge({ children, tone }) {
  const value = String(children || '')
  return (
    <span
      className={`badge ${tone || (['approved', 'Active'].includes(value) ? 'green' : ['pending', 'Archived'].includes(value) ? 'amber' : value === 'rejected' ? 'red' : 'purple')}`}
    >
      {children}
    </span>
  )
}

export function PageTitle({
  eyebrow = 'YOUR CLINIC, CONNECTED',
  title,
  description,
  action,
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export function Empty({
  title = 'Nothing here yet',
  text = 'New records will appear here.',
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Paw size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

export function Pagination({ result, page, setPage }) {
  const last = result?.last_page || result?.meta?.last_page || 1
  const total = result?.total ?? result?.meta?.total ?? 0
  return (
    <div className="pagination">
      <span>
        {total} record{total === 1 ? '' : 's'} · Page {page} of {last}
      </span>
      <div>
        <button
          className="secondary small"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <button
          className="secondary small"
          disabled={page >= last}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function useRecords(
  path,
  { search = '', page = 1, archived = false, status = '', reload = 0 } = {},
) {
  const [state, setState] = useState({
    data: [],
    loading: true,
    error: null,
    result: null,
  })
  useEffect(() => {
    const controller = new AbortController()
    setState((previous) => ({ ...previous, loading: true, error: null }))
    const [resource, fixedQuery] = path.split('?')
    const params = new URLSearchParams(fixedQuery)
    for (const [key, value] of Object.entries({
      search,
      page,
      archived: archived ? '1' : '0',
      ...(status ? { status } : {}),
    })) {
      if (!params.has(key)) params.set(key, value)
    }
    const timer = setTimeout(
      () => {
        api(`${API}/${resource}?${params}`, { signal: controller.signal })
          .then((result) =>
            setState({
              data: result.data,
              loading: false,
              error: null,
              result,
            }),
          )
          .catch((error) => {
            if (error.name !== 'AbortError')
              setState({ data: [], loading: false, error, result: null })
          })
      },
      search ? 250 : 0,
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [path, search, page, archived, status, reload])
  return state
}

export function Search({ value, onChange, placeholder = 'Search records…' }) {
  return (
    <div className="search">
      <span aria-hidden="true">⌕</span>
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function Lookup({
  label,
  path,
  value,
  onChange,
  initialLabel,
  required = true,
}) {
  const [search, setSearch] = useState('')
  const state = useRecords(path, { search })
  const id = useId()
  const selected = state.data.some((item) => String(item.id) === String(value))
  return (
    <div className="lookup">
      <label className="field" htmlFor={id}>
        <span>
          {label}
          {required && ' *'}
        </span>
        <input
          aria-label={`Search ${label.toLowerCase()}`}
          type="search"
          placeholder={`Search ${label.toLowerCase()}…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          id={id}
          required={required}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {value && !selected && (
            <option value={value}>
              {initialLabel || `Selected #${value}`}
            </option>
          )}
          {state.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name ||
                `${item.purpose} — ${new Date(item.visited_at).toLocaleDateString()}`}
              {item.client ? ` — ${item.client.name}` : ''}
              {item.email ? ` (${item.email})` : ''}
            </option>
          ))}
        </select>
      </label>
      {state.loading && <small>Loading choices…</small>}
      <ErrorMessage error={state.error} />
    </div>
  )
}

export function Modal({ title, children, onClose }) {
  const titleId = useId()
  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = document.querySelector('dialog[open]')
    dialog?.querySelector('input, select, textarea, button')?.focus()
    const handler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key === 'Tab' && dialog) {
        const elements = Array.from(
          dialog.querySelectorAll(
            'button:not(:disabled), input, select, textarea, a[href]',
          ),
        )
        const first = elements[0],
          last = elements[elements.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      previousFocus?.focus()
    }
  }, [onClose])
  return (
    <div className="modal-backdrop">
      <dialog open aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </dialog>
    </div>
  )
}

export function MutationForm({
  children,
  onSubmit,
  onDone,
  submitLabel = 'Save changes',
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        setSaving(true)
        try {
          const result = await onSubmit()
          onDone?.(result)
        } catch (error) {
          setError(error)
        } finally {
          setSaving(false)
        }
      }}
    >
      <fieldset disabled={saving}>{children}</fieldset>
      <ErrorMessage error={error} />
      <div className="form-actions">
        <button disabled={saving} type="submit">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
