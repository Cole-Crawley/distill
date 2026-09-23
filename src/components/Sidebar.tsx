import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart3,
  Info,
  Keyboard,
  MoreHorizontal,
  Network,
  Plus,
  Settings as SettingsIcon,
  Timer,
  Trash2,
} from 'lucide-react'
import { db } from '../lib/db'
import { createBlankNote, deleteNote } from '../lib/notes'
import { TOPIC_LABELS, topicColour } from '../features/knowledge-map/mapColours'
import { DropdownMenu } from './ui/dropdown-menu'
import Logo from './Logo'
import AboutModal from './AboutModal'
import ShortcutsModal from './ShortcutsModal'
import SettingsModal from './SettingsModal'
import ConfirmDialog from './ConfirmDialog'
import type { Document, TopicCategory } from '../types'

const SECTION_LINKS = [
  { to: '/study', label: 'Study', Icon: Timer },
  { to: '/map', label: 'Map', Icon: Network },
  { to: '/progress', label: 'Progress', Icon: BarChart3 },
]

type MoreModal = 'about' | 'shortcuts' | 'settings' | null

const MORE_OPTIONS = (openModal: (modal: MoreModal) => void) => [
  { label: 'Settings', onClick: () => openModal('settings'), Icon: <SettingsIcon className="h-4 w-4" /> },
  { label: 'About Distill', onClick: () => openModal('about'), Icon: <Info className="h-4 w-4" /> },
  { label: 'Keyboard shortcuts', onClick: () => openModal('shortcuts'), Icon: <Keyboard className="h-4 w-4" /> },
]

function groupByTopic(documents: Document[]): Array<{ topic: TopicCategory; documents: Document[] }> {
  const groups = new Map<TopicCategory, Document[]>()
  for (const doc of documents) {
    const bucket = groups.get(doc.topic) ?? []
    bucket.push(doc)
    groups.set(doc.topic, bucket)
  }
  return Array.from(groups.entries())
    .map(([topic, docs]) => ({
      topic,
      documents: docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    }))
    .sort((a, b) => b.documents.length - a.documents.length)
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const documents = useLiveQuery(() => db.documents.toArray()) ?? []
  const groups = groupByTopic(documents)
  const [openModal, setOpenModal] = useState<MoreModal>(null)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)

  async function handleNewNote() {
    const id = await createBlankNote()
    navigate(`/notes/${id}`)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget?.id) return
    const deletedId = deleteTarget.id
    const wasOpen = location.pathname === `/notes/${deletedId}`
    await deleteNote(deletedId)
    setDeleteTarget(null)
    if (wasOpen) {
      const remaining = documents
        .filter(doc => doc.id !== deletedId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      navigate(remaining.length > 0 ? `/notes/${remaining[0].id}` : '/')
    }
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border-warm bg-surface">
      <div className="flex items-center justify-between px-4 pt-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-stone-ink">
          <Logo />
          Distill
        </Link>
        <DropdownMenu options={MORE_OPTIONS(setOpenModal)}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenu>
      </div>

      {openModal === 'about' && <AboutModal onClose={() => setOpenModal(null)} />}
      {openModal === 'shortcuts' && <ShortcutsModal onClose={() => setOpenModal(null)} />}
      {openModal === 'settings' && <SettingsModal onClose={() => setOpenModal(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this note?"
          description={`"${deleteTarget.title || 'Untitled'}" and its flashcards will be permanently deleted. This can't be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="px-4 pt-3">
        <button
          onClick={handleNewNote}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded bg-forest font-body text-sm font-medium text-cream transition-colors duration-150 hover:bg-forest-dark"
        >
          <Plus className="h-4 w-4" />
          New note
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-4 pt-4">
        {SECTION_LINKS.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 rounded px-2 py-1.5 font-body text-sm transition-colors duration-150',
                isActive ? 'bg-forest-light text-forest font-medium' : 'text-stone-muted hover:bg-cream hover:text-stone-ink',
              ].join(' ')
            }
          >
            <link.Icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-stone-muted">Notes</p>

        {groups.length === 0 && (
          <p className="font-body text-xs text-stone-muted">
            Nothing yet. Write a note or upload something to get started.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {groups.map(group => (
            <div key={group.topic}>
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: topicColour(group.topic) }}
                />
                <span className="font-mono text-[11px] uppercase tracking-wide text-stone-muted">
                  {TOPIC_LABELS[group.topic]}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {group.documents.map(doc => (
                  <div key={doc.id} className="group relative flex items-center">
                    <NavLink
                      to={`/notes/${doc.id}`}
                      className={({ isActive }) =>
                        [
                          'flex-1 truncate rounded px-2 py-1 pr-7 font-body text-sm transition-colors duration-150',
                          isActive ? 'bg-forest-light text-forest font-medium' : 'text-stone-ink hover:bg-cream',
                        ].join(' ')
                      }
                    >
                      {doc.title || 'Untitled'}
                    </NavLink>
                    <button
                      onClick={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        setDeleteTarget(doc)
                      }}
                      aria-label={`Delete "${doc.title || 'Untitled'}"`}
                      className="absolute right-1 rounded p-1 text-stone-muted opacity-0 hover:bg-surface hover:text-stone-ink focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
