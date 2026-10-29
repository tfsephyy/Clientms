import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API, api, dateTime } from '../api'
import { useAuth } from '../auth'
import {
  Badge,
  Empty,
  ErrorMessage,
  Modal,
  PageTitle,
  Pagination,
  Search,
  Select,
  useRecords,
} from '../components'
import {
  ArchiveForm,
  ClientForm,
  CorrectionForm,
  PetForm,
  ResolveForm,
  TransferForm,
  UserForm,
  VisitForm,
} from './Forms'

function Collection({
  path,
  title,
  description,
  columns,
  actions,
  create,
  archivedFilter = false,
  statusFilter = false,
  reload = 0,
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState(false)
  const [status, setStatus] = useState('')
  const state = useRecords(path, { search, page, archived, status, reload })
  return (
    <>
      <PageTitle title={title} description={description} action={create} />
      <section className="panel collection">
        <div className="collection-toolbar">
          <Search
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder={`Search ${title.toLowerCase()}…`}
          />
          <div className="filters">
            {archivedFilter && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(event) => {
                    setArchived(event.target.checked)
                    setPage(1)
                  }}
                />{' '}
                Include archived
              </label>
            )}
            {statusFilter && (
              <Select
                label="Status"
                options={[
                  ['', 'All statuses'],
                  ['pending', 'Pending'],
                  ['approved', 'Approved'],
                  ['rejected', 'Rejected'],
                ]}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              />
            )}
          </div>
        </div>
        <ErrorMessage error={state.error} />
        {state.loading ? (
          <p className="loading" role="status">
            Loading records…
          </p>
        ) : state.error ? null : !state.data.length ? (
          <Empty
            title="No records found"
            text={
              search || status
                ? 'Try adjusting your search or filters.'
                : 'Add a record to get started.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map(([label]) => (
                    <th key={label}>{label}</th>
                  ))}
                  {actions && <th className="align-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {state.data.map((record) => (
                  <tr key={record.id}>
                    {columns.map(([label, render]) => (
                      <td key={label}>{render(record)}</td>
                    ))}
                    {actions && (
                      <td>
                        <div className="row-actions">{actions(record)}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination result={state.result} page={page} setPage={setPage} />
      </section>
    </>
  )
}

function useEditor() {
  const [modal, setModal] = useState(null)
  const [reload, setReload] = useState(0)
  const [notice, setNotice] = useState('')
  const done = () => {
    setModal(null)
    setReload((version) => version + 1)
    setNotice('Your changes have been saved.')
  }
  return { modal, setModal, reload, done, notice }
}

function Notice({ text }) {
  return (
    text && (
      <div className="success" role="status">
        {text}
      </div>
    )
  )
}

function RecordModal({ modal, close, done }) {
  if (!modal) return null
  const forms = {
    client: ClientForm,
    pet: PetForm,
    visit: VisitForm,
    correction: CorrectionForm,
    resolve: ResolveForm,
    user: UserForm,
  }
  const titles = {
    client: modal.record?.id ? 'Edit client' : 'Register client',
    pet: modal.record?.id ? 'Edit pet' : 'Register pet',
    visit: modal.record?.id ? 'Edit visit' : 'Record a visit',
    correction: 'Request a correction',
    resolve: 'Review correction request',
    user: 'Manage account',
    transfer: 'Transfer pet ownership',
    archive: 'Archive record',
  }
  const Form = forms[modal.type]
  return (
    <Modal title={titles[modal.type]} onClose={close}>
      {Form ? (
        <Form initial={modal.record || {}} onDone={done} />
      ) : modal.type === 'transfer' ? (
        <TransferForm pet={modal.record} onDone={done} />
      ) : (
        <ArchiveForm path={modal.path} name={modal.record.name} onDone={done} />
      )}
    </Modal>
  )
}

export function Clients() {
  const { user } = useAuth()
  const editor = useEditor()
  return (
    <>
      <Notice text={editor.notice} />
      <Collection
        path="clients"
        title="Clients"
        description="The people behind every pet. Keep their details close."
        archivedFilter
        reload={editor.reload}
        create={
          user.role === 'admin' && (
            <button onClick={() => editor.setModal({ type: 'client' })}>
              ＋ Register client
            </button>
          )
        }
        columns={[
          [
            'Client',
            (row) => (
              <>
                <Link className="record-name" to={`/clients/${row.id}`}>
                  {row.name}
                </Link>
                <small>Client #{row.id}</small>
              </>
            ),
          ],
          [
            'Contact',
            (row) => (
              <>
                <span>{row.email}</span>
                <small>{row.contact_number}</small>
              </>
            ),
          ],
          [
            'Address',
            (row) => <span className="cell-text">{row.address}</span>,
          ],
          ['Pets', (row) => row.pets_count],
          [
            'Status',
            (row) => <Badge>{row.archived_at ? 'Archived' : 'Active'}</Badge>,
          ],
        ]}
        actions={(row) => (
          <>
            <Link className="text-button" to={`/clients/${row.id}`}>
              View
            </Link>
            {user.role === 'admin' && (
              <>
                <button
                  className="text-button"
                  onClick={() =>
                    editor.setModal({ type: 'client', record: row })
                  }
                >
                  Edit
                </button>
                {!row.archived_at && (
                  <button
                    className="text-button danger"
                    onClick={() =>
                      editor.setModal({
                        type: 'archive',
                        path: `clients/${row.id}`,
                        record: row,
                      })
                    }
                  >
                    Archive
                  </button>
                )}
              </>
            )}
          </>
        )}
      />
      <RecordModal
        modal={editor.modal}
        close={() => editor.setModal(null)}
        done={editor.done}
      />
    </>
  )
}

export function Pets() {
  const { user } = useAuth()
  const editor = useEditor()
  const canManage = user.role !== 'staff'
  return (
    <>
      <Notice text={editor.notice} />
      <Collection
        path="pets"
        title={user.role === 'owner' ? 'My pets' : 'Pets'}
        description="Little personalities. A whole lot of love. Every pet, connected to their person."
        archivedFilter
        reload={editor.reload}
        create={
          canManage && (
            <button onClick={() => editor.setModal({ type: 'pet' })}>
              ＋ Register pet
            </button>
          )
        }
        columns={[
          [
            'Pet',
            (row) => (
              <>
                <Link className="record-name" to={`/pets/${row.id}`}>
                  {row.name}
                </Link>
                <small>Pet #{row.id}</small>
              </>
            ),
          ],
          [
            'Species / breed',
            (row) => (
              <>
                {row.species}
                <small>{row.breed || 'Breed not specified'}</small>
              </>
            ),
          ],
          [
            'Owner',
            (row) =>
              user.role === 'owner' ? (
                row.client?.name
              ) : (
                <Link to={`/clients/${row.client_id}`}>{row.client?.name}</Link>
              ),
          ],
          ['Visits', (row) => row.visits_count],
          [
            'Status',
            (row) => <Badge>{row.archived_at ? 'Archived' : 'Active'}</Badge>,
          ],
        ]}
        actions={(row) => (
          <>
            <Link className="text-button" to={`/pets/${row.id}`}>
              View
            </Link>
            {canManage && (
              <>
                <button
                  className="text-button"
                  onClick={() => editor.setModal({ type: 'pet', record: row })}
                >
                  Edit
                </button>
                {!row.archived_at && (
                  <button
                    className="text-button danger"
                    onClick={() =>
                      editor.setModal({
                        type: 'archive',
                        path: `pets/${row.id}`,
                        record: row,
                      })
                    }
                  >
                    Archive
                  </button>
                )}
              </>
            )}
          </>
        )}
      />
      <RecordModal
        modal={editor.modal}
        close={() => editor.setModal(null)}
        done={editor.done}
      />
    </>
  )
}

export function Visits() {
  const { user } = useAuth()
  const editor = useEditor()
  const canManage = user.role !== 'owner'
  return (
    <>
      <Notice text={editor.notice} />
      <Collection
        path="visits"
        title="Visit history"
        description="Keep track of the moments your pets spend with the clinic."
        reload={editor.reload}
        create={
          canManage && (
            <button onClick={() => editor.setModal({ type: 'visit' })}>
              ＋ Record a visit
            </button>
          )
        }
        columns={[
          ['Date & time', (row) => dateTime(row.visited_at)],
          [
            'Pet',
            (row) => (
              <>
                <Link className="record-name" to={`/pets/${row.pet_id}`}>
                  {row.pet?.name}
                </Link>
                <small>{row.pet?.client?.name}</small>
              </>
            ),
          ],
          [
            'Visit details',
            (row) => (
              <>
                <strong>{row.purpose}</strong>
                {row.notes && <p className="cell-text preserve">{row.notes}</p>}
              </>
            ),
          ],
          ['Recorded by', (row) => row.recorder?.name],
        ]}
        actions={(row) =>
          canManage ? (
            <button
              className="text-button"
              onClick={() => editor.setModal({ type: 'visit', record: row })}
            >
              Edit visit
            </button>
          ) : (
            <button
              className="text-button"
              onClick={() =>
                editor.setModal({
                  type: 'correction',
                  record: {
                    pet_id: row.pet_id,
                    visit_id: row.id,
                    pet: row.pet,
                    visit: row,
                  },
                })
              }
            >
              Request correction
            </button>
          )
        }
      />
      <RecordModal
        modal={editor.modal}
        close={() => editor.setModal(null)}
        done={editor.done}
      />
    </>
  )
}

export function Corrections() {
  const { user } = useAuth()
  const editor = useEditor()
  return (
    <>
      <Notice text={editor.notice} />
      <Collection
        path="corrections"
        title="Correction requests"
        description={
          user.role === 'owner'
            ? 'Help your clinic keep visit and ownership details accurate.'
            : 'Review requests and apply the corrections that keep records accurate.'
        }
        statusFilter
        reload={editor.reload}
        create={
          user.role === 'owner' && (
            <button onClick={() => editor.setModal({ type: 'correction' })}>
              ＋ Request correction
            </button>
          )
        }
        columns={[
          [
            'Pet / request',
            (row) => (
              <>
                <strong>{row.pet?.name || 'Previously registered pet'}</strong>
                <small>
                  {row.type === 'visit'
                    ? `Visit #${row.visit_id}`
                    : 'Ownership record'}{' '}
                  · #{row.id}
                </small>
              </>
            ),
          ],
          [
            'Requested changes',
            (row) => <p className="cell-text preserve">{row.description}</p>,
          ],
          [
            'Submitted',
            (row) => (
              <>
                {dateTime(row.created_at)}
                <small>{row.requester?.name}</small>
              </>
            ),
          ],
          [
            'Status / resolution',
            (row) => (
              <>
                <Badge>{row.status}</Badge>
                {row.resolution && (
                  <p className="cell-text preserve">{row.resolution}</p>
                )}
                {row.resolved_at && <small>{dateTime(row.resolved_at)}</small>}
              </>
            ),
          ],
        ]}
        actions={
          user.role === 'admin'
            ? (row) =>
                row.status === 'pending' && (
                  <button
                    className="text-button"
                    onClick={() =>
                      editor.setModal({ type: 'resolve', record: row })
                    }
                  >
                    Review
                  </button>
                )
            : undefined
        }
      />
      <RecordModal
        modal={editor.modal}
        close={() => editor.setModal(null)}
        done={editor.done}
      />
    </>
  )
}

export function Users() {
  const { user } = useAuth()
  const editor = useEditor()
  return (
    <>
      <Notice text={editor.notice} />
      <Collection
        path="users"
        title="Users & approvals"
        description="Welcome your team and manage who can access your clinic."
        statusFilter
        reload={editor.reload}
        columns={[
          [
            'User',
            (row) => (
              <>
                <strong>{row.name}</strong>
                <small>{row.email}</small>
              </>
            ),
          ],
          [
            'Contact',
            (row) => (
              <>
                {row.contact_number || 'Not completed'}
                <small className="cell-text">{row.address}</small>
              </>
            ),
          ],
          [
            'Role',
            (row) => (
              <Badge>
                {
                  {
                    owner: 'Pet Owner',
                    admin: 'Administrator',
                    staff: 'Clinic Staff',
                  }[row.role]
                }
              </Badge>
            ),
          ],
          [
            'Status',
            (row) => (
              <>
                <Badge>{row.approval_status}</Badge>
                {!row.profile_complete && <small>Profile incomplete</small>}
              </>
            ),
          ],
          ['Joined', (row) => dateTime(row.created_at)],
        ]}
        actions={(row) =>
          row.id !== user.id ? (
            <button
              className="text-button"
              onClick={() => editor.setModal({ type: 'user', record: row })}
            >
              {row.approval_status === 'pending'
                ? 'Review application'
                : 'Manage access'}
            </button>
          ) : (
            <small>Your account</small>
          )
        }
      />
      <RecordModal
        modal={editor.modal}
        close={() => editor.setModal(null)}
        done={editor.done}
      />
    </>
  )
}

export function Activity() {
  return (
    <Collection
      path="activity"
      title="Activity log"
      description="A clear history of changes made across your clinic."
      columns={[
        ['When', (row) => dateTime(row.created_at)],
        ['Who', (row) => row.actor?.name || 'System / console'],
        ['Action', (row) => <strong>{row.action}</strong>],
        ['Record', (row) => `${row.subject_type} #${row.subject_id}`],
      ]}
    />
  )
}

function useDetail(path, reload) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, loading: true, error: null })
    api(`${API}/${path}`, { signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ data: null, loading: false, error })
      })
    return () => controller.abort()
  }, [path, reload])
  return state
}

export function ClientDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const editor = useEditor()
  const state = useDetail(`clients/${id}`, editor.reload)
  if (state.loading) return <p className="loading">Loading client…</p>
  if (state.error)
    return (
      <>
        <Link to="/clients">← Back to clients</Link>
        <ErrorMessage error={state.error} />
      </>
    )
  const client = state.data
  return (
    <>
      <Link className="back-link" to="/clients">
        ← All clients
      </Link>
      <Notice text={editor.notice} />
      <PageTitle
        title={client.name}
        description={`Client #${client.id}`}
        action={
          user.role === 'admin' && (
            <button
              onClick={() =>
                editor.setModal({ type: 'client', record: client })
              }
            >
              Edit client
            </button>
          )
        }
      />
      <div className="detail-grid">
        <section className="panel">
          <h2>Contact information</h2>
          <dl>
            <dt>Email address</dt>
            <dd>{client.email}</dd>
            <dt>Contact number</dt>
            <dd>{client.contact_number}</dd>
            <dt>Address</dt>
            <dd className="preserve">{client.address}</dd>
            <dt>Status</dt>
            <dd>
              <Badge>{client.archived_at ? 'Archived' : 'Active'}</Badge>
            </dd>
          </dl>
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Registered pets</h2>
              <p>
                {client.pets.length} pet{client.pets.length === 1 ? '' : 's'} in
                this family
              </p>
            </div>
            {user.role === 'admin' && !client.archived_at && (
              <button
                className="secondary small"
                onClick={() =>
                  editor.setModal({
                    type: 'pet',
                    record: { client_id: client.id, client },
                  })
                }
              >
                ＋ Add pet
              </button>
            )}
          </div>
          {!client.pets.length ? (
            <Empty title="No pets registered yet" />
          ) : (
            <div className="pet-list">
              {client.pets.map((pet) => (
                <Link key={pet.id} to={`/pets/${pet.id}`}>
                  <span className="pet-avatar">♡</span>
                  <div>
                    <strong>{pet.name}</strong>
                    <small>
                      {pet.species} · {pet.breed || 'Breed not specified'}
                    </small>
                  </div>
                  <Badge>{pet.archived_at ? 'Archived' : 'Active'}</Badge>
                  <span>→</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <RecordModal
        modal={editor.modal}
        close={() => editor.setModal(null)}
        done={editor.done}
      />
    </>
  )
}

export function PetDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const editor = useEditor()
  const state = useDetail(`pets/${id}`, editor.reload)
  if (state.loading) return <p className="loading">Loading pet…</p>
  if (state.error)
    return (
      <>
        <Link to="/pets">← Back to pets</Link>
        <ErrorMessage error={state.error} />
      </>
    )
  const pet = state.data
  return (
    <>
      <Link className="back-link" to="/pets">
        ← All pets
      </Link>
      <Notice text={editor.notice} />
      <PageTitle
        title={pet.name}
        description={`${pet.species} · ${pet.breed || 'One of a kind'} · Pet #${pet.id}`}
        action={
          user.role !== 'staff' && (
            <button
              onClick={() => editor.setModal({ type: 'pet', record: pet })}
            >
              Edit pet
            </button>
          )
        }
      />
      <div className="pet-detail-layout">
        <section className="panel pet-summary">
          <div className="pet-avatar jumbo">♡</div>
          <h2>{pet.name}</h2>
          <Badge>{pet.archived_at ? 'Archived' : 'Active'}</Badge>
          <dl>
            <dt>Registered owner</dt>
            <dd>
              {user.role === 'owner' ? (
                pet.client?.name
              ) : (
                <Link to={`/clients/${pet.client_id}`}>{pet.client?.name}</Link>
              )}
            </dd>
            <dt>Sex</dt>
            <dd className="capitalize">{pet.sex}</dd>
            <dt>Date of birth</dt>
            <dd>{pet.birth_date?.slice(0, 10) || 'Not recorded'}</dd>
            <dt>Color / markings</dt>
            <dd>{pet.color || 'Not recorded'}</dd>
          </dl>
          {user.role === 'admin' && (
            <button
              className="secondary full"
              onClick={() => editor.setModal({ type: 'transfer', record: pet })}
            >
              Manage ownership
            </button>
          )}
          {user.role === 'owner' && (
            <button
              className="secondary full"
              onClick={() =>
                editor.setModal({
                  type: 'correction',
                  record: { pet_id: pet.id, pet },
                })
              }
            >
              Request ownership correction
            </button>
          )}
          {user.role !== 'staff' && !pet.archived_at && (
            <button
              className="text-button danger"
              onClick={() =>
                editor.setModal({
                  type: 'archive',
                  path: `pets/${pet.id}`,
                  record: pet,
                })
              }
            >
              Archive pet
            </button>
          )}
        </section>
        <div className="detail-main">
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Clinic visit history</h2>
                <p>The little details of every check-in.</p>
              </div>
              {user.role !== 'owner' && !pet.archived_at && (
                <button
                  className="secondary small"
                  onClick={() =>
                    editor.setModal({
                      type: 'visit',
                      record: { pet_id: pet.id, pet },
                    })
                  }
                >
                  ＋ Record visit
                </button>
              )}
            </div>
            {!pet.visits.length ? (
              <Empty title="No visits recorded yet" />
            ) : (
              <div className="visit-timeline">
                {pet.visits.map((visit) => (
                  <article key={visit.id}>
                    <div className="timeline-dot" />
                    <div className="section-head">
                      <div>
                        <small>{dateTime(visit.visited_at)}</small>
                        <h3>{visit.purpose}</h3>
                      </div>
                      <button
                        className="text-button"
                        onClick={() =>
                          editor.setModal(
                            user.role === 'owner'
                              ? {
                                  type: 'correction',
                                  record: {
                                    pet_id: pet.id,
                                    visit_id: visit.id,
                                    pet,
                                    visit,
                                  },
                                }
                              : { type: 'visit', record: visit },
                          )
                        }
                      >
                        {user.role === 'owner' ? 'Request correction' : 'Edit'}
                      </button>
                    </div>
                    {visit.notes && <p className="preserve">{visit.notes}</p>}
                    <small>Recorded by {visit.recorder?.name}</small>
                  </article>
                ))}
              </div>
            )}
          </section>
          {user.role === 'admin' && (
            <section className="panel ownership-panel">
              <h2>Ownership records</h2>
              {pet.ownerships?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Owner</th>
                        <th>From</th>
                        <th>Until</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pet.ownerships.map((record) => (
                        <tr key={record.id}>
                          <td>{record.client?.name}</td>
                          <td>{dateTime(record.started_at)}</td>
                          <td>
                            {record.ended_at ? (
                              dateTime(record.ended_at)
                            ) : (
                              <Badge>Current owner</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No ownership history has been recorded.</p>
              )}
            </section>
          )}
        </div>
      </div>
      <RecordModal
        modal={editor.modal}
        close={() => editor.setModal(null)}
        done={editor.done}
      />
    </>
  )
}
