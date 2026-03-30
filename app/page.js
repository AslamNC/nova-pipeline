'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { uid, scoreClass, statusLabel, statusColor } from '../lib/utils'
import AddLeadModal from '../components/AddLeadModal'
import DetailPanel from '../components/DetailPanel'

export default function Pipeline() {
  const [leads, setLeads] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [detailLead, setDetailLead] = useState(null)
  const [toast, setToast] = useState('')
  const [processing, setProcessing] = useState(new Set())
  const [userName, setUserName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [activeUsers, setActiveUsers] = useState([])
  const toastTimer = useRef(null)
  const presenceRef = useRef(null)

  // ── TOAST ──
  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }, [])

  // ── USER NAME ──
  useEffect(() => {
    const saved = localStorage.getItem('nova_username')
    if (saved) { setUserName(saved); }
    else setShowNamePrompt(true)
  }, [])

  // ── PRESENCE ──
  useEffect(() => {
    if (!userName) return
    const channel = supabase.channel('presence', { config: { presence: { key: userName } } })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state).map(k => state[k][0])
        setActiveUsers(users.filter(u => u && u.name))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: userName, online_at: new Date().toISOString() })
        }
      })
    presenceRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [userName])

  // ── REAL-TIME LEADS ──
  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from('leads').select('*').order('added_at', { ascending: false })
      if (data) setLeads(data)
    }
    fetchLeads()

    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ── SAVE / DELETE ──
  const saveLead = async (lead) => {
    const { id, ...data } = lead
    data.updated_by = userName || 'Unknown'
    data.updated_at = new Date().toISOString()
    await supabase.from('leads').upsert({ id, ...data })
  }

  const deleteLead = async (id) => {
    await supabase.from('leads').delete().eq('id', id)
    if (detailLead?.id === id) setDetailLead(null)
  }

  // ── FILTERS ──
  const filtered = leads.filter(l => {
    if (search && !(l.company || '').toLowerCase().includes(search.toLowerCase()) && !(l.contact || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && l.status !== filterStatus) return false
    if (filterIndustry && l.industry !== filterIndustry) return false
    if (filterScore === 'high' && !(l.score >= 7)) return false
    if (filterScore === 'mid' && !(l.score >= 4 && l.score <= 6)) return false
    if (filterScore === 'low' && !(l.score >= 1 && l.score <= 3)) return false
    if (filterScore === 'none' && l.score) return false
    return true
  })

  const industries = [...new Set(leads.map(l => l.industry).filter(Boolean))].sort()

  // ── STATS ──
  const stats = {
    total: leads.length,
    researched: leads.filter(l => ['researched', 'ready', 'sent', 'replied'].includes(l.status)).length,
    ready: leads.filter(l => l.status === 'ready').length,
    sent: leads.filter(l => l.status === 'sent').length,
    replied: leads.filter(l => l.status === 'replied').length,
  }

  // ── AI ACTIONS ──
  const researchLead = async (lead) => {
    setProcessing(p => new Set([...p, lead.id + '_research']))
    try {
      const res = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const updated = { ...lead, signal: data.signal, score: data.score, score_reason: data.scoreReason, status: lead.status === 'new' ? 'researched' : lead.status }
      await saveLead(updated)
      if (detailLead?.id === lead.id) setDetailLead(updated)
      showToast('Research done: ' + lead.company)
    } catch (e) { showToast('Error: ' + e.message) }
    finally { setProcessing(p => { const n = new Set(p); n.delete(lead.id + '_research'); return n }) }
  }

  const generateEmail = async (lead) => {
    setProcessing(p => new Set([...p, lead.id + '_email']))
    try {
      const res = await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const updated = { ...lead, email_subject: data.subject, email_body: data.body, status: 'ready' }
      await saveLead(updated)
      if (detailLead?.id === lead.id) setDetailLead(updated)
      showToast('Email ready: ' + lead.company)
    } catch (e) { showToast('Error: ' + e.message) }
    finally { setProcessing(p => { const n = new Set(p); n.delete(lead.id + '_email'); return n }) }
  }

  // ── BULK ──
  const bulkAction = async (action) => {
    const ids = [...selected]
    showToast(`Processing ${ids.length} leads...`)
    for (const id of ids) {
      const lead = leads.find(l => l.id === id)
      if (lead) await (action === 'research' ? researchLead(lead) : generateEmail(lead))
    }
    setSelected(new Set())
  }

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} leads?`)) return
    for (const id of [...selected]) await deleteLead(id)
    setSelected(new Set())
    showToast('Leads deleted')
  }

  // ── EXPORT ──
  const exportCSV = () => {
    const rows = [['Company', 'Contact', 'Title', 'Email', 'Industry', 'Volume', 'Location', 'Score', 'Signal', 'Email Subject', 'Email Body', 'Status', 'Updated By', 'Notes']]
    leads.forEach(l => rows.push([l.company || '', l.contact || '', l.title || '', l.contact_email || '', l.industry || '', l.volume || '', l.location || '', l.score || '', (l.signal || '').replace(/\n/g, ' '), l.email_subject || '', (l.email_body || '').replace(/\n/g, ' '), l.status || '', l.updated_by || '', (l.notes || '').replace(/\n/g, ' ')]))
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'nova_pipeline.csv'; a.click()
  }

  const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

  return (
    <div className="min-h-screen" style={{ background: '#f5f4f0', fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAME PROMPT */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl p-7 max-w-sm w-full mx-4" style={{ border: '0.5px solid #e0dcd6' }}>
            <div className="text-base font-medium mb-1">What's your name?</div>
            <div className="text-sm mb-4" style={{ color: '#6b6760' }}>So teammates can see who made changes.</div>
            <input className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={{ border: '0.5px solid #e0dcd6', background: '#f5f4f0', outline: 'none', fontFamily: 'inherit' }}
              placeholder="e.g. Aslam" id="nameInp"
              onKeyDown={e => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) { setUserName(v); localStorage.setItem('nova_username', v); setShowNamePrompt(false) } } }} autoFocus />
            <div className="flex justify-end">
              <button className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: '#1a1916', fontFamily: 'inherit' }}
                onClick={() => { const v = document.getElementById('nameInp').value.trim(); if (v) { setUserName(v); localStorage.setItem('nova_username', v); setShowNamePrompt(false) } }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div className="sticky top-0 z-40 flex items-center gap-3 px-6 h-13" style={{ background: '#fff', borderBottom: '0.5px solid #e0dcd6', height: '52px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>
          Nova <span style={{ color: '#a09d98', fontWeight: 400 }}>· Peoplebox.ai</span>
        </div>
        <div className="flex-1" />

        {/* active users */}
        <div className="flex gap-1">
          {activeUsers.slice(0, 5).map((u, i) => (
            <div key={i} title={u.name} className="flex items-center justify-center text-white rounded-full text-xs font-medium"
              style={{ width: 26, height: 26, background: avatarColors[i % avatarColors.length], fontSize: 9, border: '2px solid #fff' }}>
              {(u.name || '').slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <div className="rounded-full" style={{ width: 7, height: 7, background: '#22c55e' }} />
          <span style={{ fontSize: 11, color: '#a09d98' }}>Live sync</span>
        </div>
        <button onClick={exportCSV} className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '0.5px solid #e0dcd6', background: '#fff', color: '#6b6760', cursor: 'pointer', fontFamily: 'inherit' }}>
          Export CSV
        </button>
        <button onClick={() => setShowAdd(true)} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: '#1a1916', fontFamily: 'inherit', cursor: 'pointer' }}>
          + Add Leads
        </button>
      </div>

      {/* STATS BAR */}
      <div className="flex items-stretch gap-0 px-6 overflow-x-auto" style={{ background: '#fff', borderBottom: '0.5px solid #e0dcd6' }}>
        {[['Total', stats.total], ['Researched', stats.researched], ['Email Ready', stats.ready], ['Sent', stats.sent], ['Replied', stats.replied]].map(([label, val], i, arr) => (
          <div key={label} className="flex flex-col gap-0.5 py-2.5" style={{ paddingRight: 20, marginRight: i < arr.length - 1 ? 20 : 0, borderRight: i < arr.length - 1 ? '0.5px solid #e0dcd6' : 'none', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: 20, fontWeight: 500, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: '#a09d98', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="p-6 flex flex-col gap-4">

        {/* TOOLBAR */}
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company, contact..."
            className="text-sm px-3 py-1.5 rounded-lg" style={{ border: '0.5px solid #e0dcd6', background: '#fff', outline: 'none', width: 220, fontFamily: 'inherit' }} />
          {[
            [filterStatus, setFilterStatus, [['', 'All statuses'], ['new', 'New'], ['researched', 'Researched'], ['ready', 'Email Ready'], ['sent', 'Sent'], ['replied', 'Replied']]],
            [filterIndustry, setFilterIndustry, [['', 'All industries'], ...industries.map(i => [i, i])]],
            [filterScore, setFilterScore, [['', 'All scores'], ['high', 'High fit (7–10)'], ['mid', 'Medium (4–6)'], ['low', 'Low fit (1–3)'], ['none', 'Not scored']]],
          ].map(([val, set, opts], i) => (
            <select key={i} value={val} onChange={e => set(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg" style={{ border: '0.5px solid #e0dcd6', background: '#fff', color: '#6b6760', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}

          {selected.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs ml-2" style={{ background: '#1a1916' }}>
              <span>{selected.size} selected</span>
              {[['Research All', () => bulkAction('research')], ['Generate Emails', () => bulkAction('email')], ['Delete', bulkDelete]].map(([l, fn]) => (
                <button key={l} onClick={fn} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
              ))}
              <button onClick={() => setSelected(new Set())} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '0.5px solid #e0dcd6' }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f0ede8' }}>
                  <th className="px-3 py-2.5" style={{ borderBottom: '0.5px solid #e0dcd6', textAlign: 'left' }}>
                    <input type="checkbox" checked={selected.size === leads.length && leads.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(leads.map(l => l.id)) : new Set())}
                      style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#1a1916' }} />
                  </th>
                  {['Company', 'Industry', 'Volume', 'Score', 'Signal', 'Status', 'Updated by', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left" style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: '#a09d98', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 400, borderBottom: '0.5px solid #e0dcd6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-16" style={{ color: '#a09d98', fontSize: 13 }}>
                    No leads yet — click <strong>+ Add Leads</strong> to get started.
                  </td></tr>
                ) : filtered.map(l => {
                  const sc = l.score ? scoreClass(l.score) : 'score-none'
                  const isResearching = processing.has(l.id + '_research')
                  const isEmailing = processing.has(l.id + '_email')
                  return (
                    <tr key={l.id} className="hover:bg-gray-50" style={{ borderBottom: '0.5px solid #e0dcd6' }}>
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={selected.has(l.id)}
                          onChange={e => { const s = new Set(selected); e.target.checked ? s.add(l.id) : s.delete(l.id); setSelected(s) }}
                          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#1a1916' }} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div style={{ fontWeight: 500 }}>{l.company}</div>
                        <div style={{ fontSize: 11, color: '#a09d98' }}>{[l.contact, l.title].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-3 py-2.5" style={{ color: '#6b6760' }}>{l.industry || '–'}</td>
                      <td className="px-3 py-2.5" style={{ color: '#6b6760', fontSize: 12 }}>{l.volume || '–'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`score-pill ${sc}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 500 }}>
                          {l.score || '–'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div style={{ fontSize: 11, color: '#6b6760', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.signal || '–'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${statusColor(l.status)}`} style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: '0.02em' }}>
                          {statusLabel(l.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" style={{ fontSize: 11, color: '#a09d98', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                        {l.updated_by || '–'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          {[
                            [isResearching ? '...' : 'Research', () => researchLead(l), isResearching, true],
                            [isEmailing ? '...' : 'Email', () => generateEmail(l), isEmailing, true],
                            ['View', () => setDetailLead(l), false, false],
                            ['✕', () => deleteLead(l.id), false, false],
                          ].map(([label, fn, loading, isAI], i) => (
                            <button key={i} onClick={fn} disabled={loading}
                              className="text-xs px-2 py-1 rounded"
                              style={{ border: isAI ? '0.5px solid #3b82f6' : '0.5px solid #e0dcd6', color: isAI ? '#1d4e89' : '#6b6760', background: 'transparent', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1, fontFamily: 'inherit' }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onAdd={saveLead} showToast={showToast} userName={userName} />}
      {detailLead && (
        <DetailPanel
          lead={leads.find(l => l.id === detailLead.id) || detailLead}
          onClose={() => setDetailLead(null)}
          onSave={saveLead}
          onDelete={deleteLead}
          onResearch={researchLead}
          onEmail={generateEmail}
          processing={processing}
          showToast={showToast}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-2.5 rounded-lg text-white text-sm z-50"
          style={{ background: '#1a1916', fontFamily: 'inherit', maxWidth: 320 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
