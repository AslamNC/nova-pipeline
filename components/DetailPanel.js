'use client'
import { useState } from 'react'
import { scoreClass, statusLabel } from '../lib/utils'

const STATUSES = ['new', 'researched', 'ready', 'sent', 'replied']

export default function DetailPanel({ lead: l, onClose, onSave, onDelete, onResearch, onEmail, processing, showToast }) {
  const [findingEmail, setFindingEmail] = useState(false)
  if (!l) return null

  const sc = l.score ? scoreClass(l.score) : 'score-none'
  const isResearching = processing.has(l.id + '_research')
  const isEmailing = processing.has(l.id + '_email')

  const copyEmail = () => {
    navigator.clipboard.writeText('Subject: ' + l.email_subject + '\n\n' + l.email_body).catch(() => {})
    showToast('Email copied!')
  }

  const findEmail = async () => {
    if (!l.contact) { showToast('Add a contact name first'); return }
    setFindingEmail(true)
    try {
      const res = await fetch('/api/find-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: l.company, contact: l.contact })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const updates = {}
      if (data.email) updates.contact_email = data.email
      if (data.linkedin) updates.linkedin = data.linkedin
      if (data.title && !l.title) updates.title = data.title
      updates.email_confidence = data.email_confidence
      await onSave({ ...l, ...updates })
      showToast('Contact details found!')
    } catch(e) { showToast('Error: ' + e.message) }
    finally { setFindingEmail(false) }
  }

  const sl = (text) => (
    <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: '#a09d98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{text}</div>
  )

  const box = (children) => (
    <div style={{ background: '#f5f4f0', border: '0.5px solid #e0dcd6', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.7 }}>{children}</div>
  )

  const confColors = { high: ['#d8f3dc','#2d6a4f'], medium: ['#fef3c7','#92400e'], low: ['#fee2e2','#991b1b'] }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ position:'fixed',inset:0,zIndex:50,display:'flex',justifyContent:'flex-end' }}>
      <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div style={{ position:'relative',width:520,maxWidth:'95vw',background:'#fff',height:'100%',overflowY:'auto',borderLeft:'0.5px solid #e0dcd6' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem',borderBottom:'0.5px solid #e0dcd6',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem',position:'sticky',top:0,background:'#fff',zIndex:10 }}>
          <div>
            <div style={{ fontSize:17,fontWeight:500 }}>{l.company}</div>
            <div style={{ fontSize:12,color:'#6b6760',marginTop:3 }}>{[l.contact,l.title].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:18,color:'#a09d98',cursor:'pointer',flexShrink:0 }}>✕</button>
        </div>

        <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1.25rem' }}>

          {/* Status */}
          <div>
            {sl('Status')}
            <select value={l.status || 'new'} onChange={e => onSave({ ...l, status: e.target.value })}
              style={{ fontFamily:'inherit',fontSize:12,padding:'6px 10px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#f5f4f0',color:'#1a1916',outline:'none',cursor:'pointer' }}>
              {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>

          {/* Contact details + email finder */}
          <div>
            {sl('Contact & Email')}
            <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              {/* Email row */}
              <div style={{ display:'flex',alignItems:'center',gap:8,background:'#f5f4f0',border:'0.5px solid #e0dcd6',borderRadius:8,padding:'10px 12px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:'#a09d98',marginBottom:2 }}>Email</div>
                  <div style={{ fontSize:13,fontFamily:"'DM Mono',monospace",color: l.contact_email ? '#1a1916' : '#a09d98' }}>
                    {l.contact_email || 'Not found yet'}
                  </div>
                  {l.email_confidence && (() => {
                    const [bg,color] = confColors[l.email_confidence] || ['#f0ede8','#9a9894']
                    return <span style={{ fontSize:9,fontFamily:"'DM Mono',monospace",padding:'1px 6px',borderRadius:3,background:bg,color,marginTop:4,display:'inline-block' }}>{l.email_confidence} confidence</span>
                  })()}
                </div>
                <button onClick={findEmail} disabled={findingEmail}
                  style={{ fontSize:11,padding:'6px 12px',borderRadius:6,border:'0.5px solid #3b82f6',color:'#1d4e89',background:'#eff6ff',cursor:findingEmail?'default':'pointer',opacity:findingEmail?0.6:1,fontFamily:'inherit',whiteSpace:'nowrap' }}>
                  {findingEmail ? 'Searching...' : l.contact_email ? 'Re-find' : '✦ Find Email'}
                </button>
              </div>
              {/* LinkedIn */}
              {l.linkedin && (
                <a href={l.linkedin} target="_blank" style={{ fontSize:12,color:'#3b82f6',textDecoration:'none',padding:'6px 12px',background:'#eff6ff',borderRadius:6,border:'0.5px solid #bfdbfe',display:'inline-block' }}>
                  LinkedIn Profile ↗
                </a>
              )}
            </div>
          </div>

          {/* Score */}
          <div>
            {sl('Fit Score')}
            {l.score ? (
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span className={`score-pill ${sc}`} style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:40,height:40,borderRadius:'50%',fontSize:16,fontWeight:500,flexShrink:0 }}>{l.score}</span>
                <span style={{ fontSize:12,color:'#6b6760',lineHeight:1.5 }}>{l.score_reason || ''}</span>
              </div>
            ) : <span style={{ fontSize:13,color:'#a09d98' }}>Not scored yet</span>}
          </div>

          {/* Signal */}
          <div>
            {sl('Hiring Signal')}
            {l.signal ? box(<span>{l.signal}</span>) : <span style={{ fontSize:13,color:'#a09d98' }}>No signal yet</span>}
          </div>

          {/* Email */}
          <div>
            {sl('Personalized Email')}
            {l.email_subject ? box(
              <>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:500,marginBottom:8,paddingBottom:8,borderBottom:'0.5px solid #e0dcd6' }}>
                  Subject: {l.email_subject}
                </div>
                <div style={{ whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.75 }}>{l.email_body}</div>
              </>
            ) : <span style={{ fontSize:13,color:'#a09d98' }}>Not generated yet</span>}
          </div>

          {/* Actions */}
          <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
            {[
              [isResearching ? 'Researching...' : 'Re-research', () => onResearch(l), isResearching, false],
              [isEmailing ? 'Generating...' : 'Generate email', () => onEmail(l), isEmailing, false],
              ...(l.email_body ? [['Copy email', copyEmail, false, false]] : []),
              ['Delete lead', () => onDelete(l.id), false, true],
            ].map(([label, fn, loading, danger]) => (
              <button key={label} onClick={fn} disabled={loading}
                style={{ fontFamily:'inherit',fontSize:12,padding:'7px 14px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',color:danger?'#991b1b':'#1a1916',cursor:loading?'default':'pointer',opacity:loading?0.5:1 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Updated by */}
          {l.updated_by && (
            <div style={{ fontSize:11,color:'#a09d98' }}>Last updated by <strong>{l.updated_by}</strong></div>
          )}

          {/* Notes */}
          <div>
            {sl('Notes')}
            <textarea defaultValue={l.notes || ''} placeholder="Add notes..."
              onChange={e => onSave({ ...l, notes: e.target.value })}
              style={{ width:'100%',fontFamily:'inherit',fontSize:13,padding:'10px 12px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#f5f4f0',outline:'none',resize:'vertical',minHeight:80,lineHeight:1.6,color:'#1a1916' }} />
          </div>

          {/* Meta */}
          <div style={{ fontSize:11,color:'#a09d98' }}>
            {[l.industry&&'Industry: '+l.industry, l.volume&&'Volume: '+l.volume, l.location&&'Location: '+l.location].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </div>
  )
}
