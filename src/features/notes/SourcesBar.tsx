import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Link as LinkIcon, Sparkles } from 'lucide-react'
import { db } from '../../lib/db'
import SourceViewerModal from './SourceViewerModal'
import type { SourceAttachment, SourceType } from '../../types'

interface SourcesBarProps {
  documentId: number
}

const SOURCE_ICONS: Record<SourceType, typeof FileText> = {
  pdf: FileText,
  epub: FileText,
  docx: FileText,
  text: FileText,
  url: LinkIcon,
}

// Row of rounded pills, one per uploaded file/URL; clicking a pill opens the full original text.
export default function SourcesBar({ documentId }: SourcesBarProps) {
  const attachments = useLiveQuery(async () => {
    const rows = await db.sources.where('documentId').equals(documentId).toArray()
    return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [documentId])
  const [viewing, setViewing] = useState<SourceAttachment | null>(null)

  if (!attachments || attachments.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {attachments.map(attachment => {
        const Icon = SOURCE_ICONS[attachment.sourceType]
        return (
          <button
            key={attachment.id}
            onClick={() => setViewing(attachment)}
            className="flex items-center gap-1.5 rounded-full border border-border-warm bg-surface px-3 py-1.5 font-body text-xs text-stone-ink transition-colors duration-150 hover:bg-forest-light hover:text-forest"
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[14rem] truncate">{attachment.title}</span>
            <span className="font-mono text-[10px] text-stone-muted">
              {attachment.wordCount.toLocaleString()}w
            </span>
            {attachment.wasClarified && <Sparkles className="h-3 w-3 shrink-0 text-forest" />}
          </button>
        )
      })}

      {viewing && <SourceViewerModal attachment={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
