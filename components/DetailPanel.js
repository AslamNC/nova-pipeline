'use client'
import { scoreClass, statusLabel } from '../lib/utils'

const STATUSES = ['new', 'researched', 'ready', 'sent', 'replied']

export default function DetailPanel({ lead: l, onClose, onSave, onDelete, onResearch, onEmail, processing, showToast }) {
  if (!l) return null
  const sc = l.score ? scoreClass(l.score) : 'score-none'
  const isResearching = processing.has(l.id + '_research')
  const isEmailing = processing.has(l.id + '_email')

  const copyEmail = () => {
    navigator.clipboard.writeText('Subject: ' + l.email_subject + '\n\n' + l.email_body).catch(() => {})
    showToast('Email copied!')
  }

  const sectionLabel = (text) => (
    <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: '#a09d98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{text}</div>
  )

  const box = (children) => (
    <div style={{ background: '#f5f4f0', border: '0.5px solid #e0dcd6', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.7 }}>{children}</div>
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div className="relative flex flex-col overflow-y-auto" style={{ width: 520, maxWidth: '95vw', background: '#fff', height: '100%', borderLeft: '0.5px solid #e0dcd6' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 sticky top-0 bg-white z-10" style={{ borderBottom: '0.5px solid #e0dcd6' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500 }}>{l.company}</div>
            <div style={{ fontSize: 12, color: '#6b6760', marginTop: 3 }}>{[l.contact, l.title, l.contact_email].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#a09d98', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">

          {/* Status */}
          <div>
            {sectionLabel('Status')}
            <select value={l.status || 'new'} onChange={e => onSave({ ...l, status: e.target.value })}
              style={{ fontFamily: 'inherit', fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '0.5px solid #e0dcd6', background: '#f5f4f0', color: '#1a1916', outline: 'none', cursor: 'pointer' }}>
              {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>

          {/* Score */}
          <div>
            {sectionLabel('Fit Score')}
            {l.score ? (
              <div className="flex items-center gap-3">
                <span className={`score-pill ${sc}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', fontSize: 16, fontWeight: 500, flexShrink: 0 }}>{l.score}</span>
                <span style={{ fontSize: 12, color: '#6b6760', lineHeight: 1.5 }}>{l.score_reason || ''}</span>
              </div>
            ) : <span style={{ fontSize: 13, color: '#a09d98' }}>Not scored yet</span>}
          </div>

          {/* Signal */}
          <div>
            {sectionLabel('Hiring Signal')}
            {l.signal ? box(<span>{l.signal}</span>) : <span style={{ fontSize: 13, color: '#a09d98' }}>No signal yet</span>}
          </div>

          {/* Email */}
          <div>
            {sectionLabel('Personalized Email')}
            {l.email_subject ? box(
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, marginBottom: 8, paddingBottom: 8, borderBottom: '0.5px solid #e0dcd6' }}>
                  Subject: {l.email_subject}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.75 }}>{l.email_body}</div>
              </>
            ) : <span style={{ fontSize: 13, color: '#a09d98' }}>Not generated yet</span>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {[
              [isResearching ? 'Researching...' : 'Re-research', () => onResearch(l), isResearching, false],
              [isEmailing ? 'Generating...' : 'Generate email', () => onEmail(l), isEmailing, false],
              ...(l.email_body ? [['Copy email', copyEmail, false, false]] : []),
              ['Delete lead', () => onDelete(l.id), false, true],
            ].map(([label, fn, loading, danger]) => (
              <button key={label} onClick={fn} disabled={loading}
                style={{ fontFamily: 'inherit', fontSize: 12, padding: '7px 14px', borderRadius: 8, border: danger ? '0.5px solid #e0dcd6' : '0.5px solid #e0dcd6', background: '#fff', color: danger ? '#991b1b' : '#1a1916', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Updated by */}
          {l.updated_by && (
            <div style={{ fontSize: 11, color: '#a09d98' }}>Last updated by <strong>{l.updated_by}</strong></div>
          )}

          {/* Notes */}
          <div>
            {sectionLabel('Notes')}
            <textarea defaultValue={l.notes || ''} placeholder="Add notes..."
              onChange={e => onSave({ ...l, notes: e.target.value })}
              style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e0dcd6', background: '#f5f4f0', outline: 'none', resize: 'vertical', minHeight: 80, lineHeight: 1.6, color: '#1a1916' }} />
          </div>

          {/* Meta */}
          <div style={{ fontSize: 11, color: '#a09d98' }}>
            {[l.industry && 'Industry: ' + l.industry, l.volume && 'Volume: ' + l.volume, l.location && 'Location: ' + l.location].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </div>
  )
}
