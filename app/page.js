'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { uid, scoreClass, statusLabel, statusColor } from '../lib/utils'
import AddLeadModal from '../components/AddLeadModal'
import DetailPanel from '../components/DetailPanel'

const SORT_FIELDS = {
  company: 'Company',
  industry: 'Industry',
  score: 'Score',
  status: 'Status',
  updated_at: 'Updated',
  added_at: 'Added',
}

export default function Pipeline() {
  const [leads, setLeads] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [sortField, setSortField] = useState('added_at')
  const [sortDir, setSortDir] = useState('desc')

  // Load persisted sort on mount
  useEffect(() => {
    const sf = localStorage.getItem('nova_sort_field')
    const sd = localStorage.getItem('nova_sort_dir')
    if (sf) setSortField(sf)
    if (sd) setSortDir(sd)
  }, [])
  const [selected, setSelected] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [detailLead, setDetailLead] = useState(null)
  const [toast, setToast] = useState('')
  const [processing, setProcessing] = useState(new Set())
  const [userName, setUserName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [activeUsers, setActiveUsers] = useState([])
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('nova_username')
    if (saved) setUserName(saved)
    else setShowNamePrompt(true)
  }, [])

  useEffect(() => {
    if (!userName) return
    const channel = supabase.channel('presence_pipeline', { config: { presence: { key: userName } } })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setActiveUsers(Object.values(state).flat().filter(u => u && u.name))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ name: userName })
      })
    return () => supabase.removeChannel(channel)
  }, [userName])

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from('leads').select('*').order('added_at', { ascending: false })
      if (data) setLeads(data)
    }
    fetchLeads()
    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  // ── SAVE with optimistic update ──
  const saveLead = useCallback(async (lead) => {
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === lead.id)
      if (idx > -1) { const u = [...prev]; u[idx] = lead; return u }
      return [lead, ...prev]
    })
    const { id, ...data } = lead
    data.updated_by = userName || 'Unknown'
    data.updated_at = new Date().toISOString()
    await supabase.from('leads').upsert({ id, ...data })
  }, [userName])

  const deleteLead = async (id) => {
    setLeads(prev => prev.filter(l => l.id !== id))
    await supabase.from('leads').delete().eq('id', id)
    if (detailLead?.id === id) setDetailLead(null)
  }

  // ── SORT ──
  const handleSort = (field) => {
    if (sortField === field) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc'
      setSortDir(newDir)
      localStorage.setItem('nova_sort_dir', newDir)
    } else {
      setSortField(field)
      setSortDir('asc')
      localStorage.setItem('nova_sort_field', field)
      localStorage.setItem('nova_sort_dir', 'asc')
    }
  }

  const sortIcon = (field) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 3 }}>↕</span>
    return <span style={{ marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // ── FILTER + SORT ──
  const filtered = leads
    .filter(l => {
      if (search && !(l.company || '').toLowerCase().includes(search.toLowerCase()) && !(l.contact || '').toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus && l.status !== filterStatus) return false
      if (filterIndustry && l.industry !== filterIndustry) return false
      if (filterScore === 'high' && !(l.score >= 7)) return false
      if (filterScore === 'mid' && !(l.score >= 4 && l.score <= 6)) return false
      if (filterScore === 'low' && !(l.score >= 1 && l.score <= 3)) return false
      if (filterScore === 'none' && l.score) return false
      return true
    })
    .sort((a, b) => {
      let av = a[sortField] ?? ''
      let bv = b[sortField] ?? ''
      if (sortField === 'score') { av = Number(av) || 0; bv = Number(bv) || 0 }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase() }
      if (sortDir === 'asc') return av > bv ? 1 : av < bv ? -1 : 0
      return av < bv ? 1 : av > bv ? -1 : 0
    })

  const industries = [...new Set(leads.map(l => l.industry).filter(Boolean))].sort()

  const stats = {
    total: leads.length,
    researched: leads.filter(l => ['researched','ready','sent','replied'].includes(l.status)).length,
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
      await saveLead({ ...lead, signal: data.signal, score: data.score, score_reason: data.scoreReason, status: lead.status === 'new' ? 'researched' : lead.status })
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
      await saveLead({ ...lead, email_subject: data.subject, email_body: data.body, status: 'ready' })
      showToast('Email ready: ' + lead.company)
    } catch (e) { showToast('Error: ' + e.message) }
    finally { setProcessing(p => { const n = new Set(p); n.delete(lead.id + '_email'); return n }) }
  }

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
  }

  const exportCSV = () => {
    if (!leads.length) { showToast('No leads to export'); return }
    const rows = [['Company','Contact','Title','Email','Industry','Volume','Location','Score','Signal','Email Subject','Email Body','Status','Updated By','Notes']]
    leads.forEach(l => rows.push([l.company||'',l.contact||'',l.title||'',l.contact_email||'',l.industry||'',l.volume||'',l.location||'',l.score||'',(l.signal||'').replace(/\n/g,' '),l.email_subject||'',(l.email_body||'').replace(/\n/g,' '),l.status||'',l.updated_by||'',(l.notes||'').replace(/\n/g,' ')]))
    const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='nova_pipeline.csv'; a.click()
  }

  const avatarColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4']
  const thStyle = { padding: '10px 12px', fontSize: 10, fontFamily: "'DM Mono', monospace", color: '#a09d98', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 400, borderBottom: '0.5px solid #e0dcd6', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: 'left' }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', fontFamily: "'DM Sans', sans-serif" }}>

      {showNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)' }}>
          <div style={{ background:'#fff',borderRadius:12,padding:'28px',maxWidth:340,width:'100%',margin:'0 16px',border:'0.5px solid #e0dcd6' }}>
            <div style={{ fontSize:16,fontWeight:500,marginBottom:6 }}>What's your name?</div>
            <div style={{ fontSize:13,color:'#6b6760',marginBottom:16,lineHeight:1.5 }}>So teammates can see who made changes.</div>
            <input autoFocus id="nameInp" placeholder="e.g. Aslam" style={{ width:'100%',fontSize:13,padding:'8px 10px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#f5f4f0',outline:'none',fontFamily:'inherit',marginBottom:12 }}
              onKeyDown={e => { if(e.key==='Enter'){const v=e.target.value.trim();if(v){setUserName(v);localStorage.setItem('nova_username',v);setShowNamePrompt(false)}}}} />
            <div style={{ display:'flex',justifyContent:'flex-end' }}>
              <button style={{ fontSize:13,padding:'8px 16px',borderRadius:8,border:'none',background:'#1a1916',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}
                onClick={()=>{const v=document.getElementById('nameInp').value.trim();if(v){setUserName(v);localStorage.setItem('nova_username',v);setShowNamePrompt(false)}}}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',alignItems:'center',gap:'1rem',height:52,position:'sticky',top:0,zIndex:40,flexWrap:'wrap' }}>
        <div style={{ flex:1,fontWeight:500,fontSize:14 }}>Outbound Pipeline</div>
        <div style={{ display:'flex',gap:4 }}>
          {activeUsers.slice(0,5).map((u,i) => (
            <div key={i} title={u.name} style={{ width:26,height:26,borderRadius:'50%',background:avatarColors[i%avatarColors.length],color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:500,border:'2px solid #fff' }}>
              {(u.name||'').slice(0,2).toUpperCase()}
            </div>
          ))}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:5 }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background:'#22c55e' }} />
          <span style={{ fontSize:11,color:'#a09d98' }}>Live sync</span>
        </div>
        <button onClick={exportCSV} style={{ fontSize:12,padding:'7px 14px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',color:'#6b6760',cursor:'pointer',fontFamily:'inherit' }}>Export CSV</button>
        <button onClick={() => setShowAdd(true)} style={{ fontSize:12,padding:'7px 14px',borderRadius:8,border:'none',background:'#1a1916',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>+ Add Leads</button>
      </div>

      {/* STATS */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',overflowX:'auto' }}>
        {[['Total',stats.total],['Researched',stats.researched],['Email Ready',stats.ready],['Sent',stats.sent],['Replied',stats.replied]].map(([label,val],i,arr) => (
          <div key={label} style={{ padding:'10px 20px 10px 0',marginRight:i<arr.length-1?20:0,borderRight:i<arr.length-1?'0.5px solid #e0dcd6':'none',display:'flex',flexDirection:'column',gap:2,whiteSpace:'nowrap' }}>
            <div style={{ fontSize:20,fontWeight:500,lineHeight:1 }}>{val}</div>
            <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.05em',textTransform:'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem' }}>

        {/* TOOLBAR */}
        <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company, contact..."
            style={{ fontSize:13,padding:'7px 12px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',outline:'none',width:220,fontFamily:'inherit' }} />
          {[[filterStatus,setFilterStatus,[['','All statuses'],['new','New'],['researched','Researched'],['ready','Email Ready'],['sent','Sent'],['replied','Replied']]],
            [filterIndustry,setFilterIndustry,[['','All industries'],...industries.map(i=>[i,i])]],
            [filterScore,setFilterScore,[['','All scores'],['high','High fit (7–10)'],['mid','Medium (4–6)'],['low','Low fit (1–3)'],['none','Not scored']]]
          ].map(([val,set,opts],i) => (
            <select key={i} value={val} onChange={e=>set(e.target.value)}
              style={{ fontSize:12,padding:'7px 10px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',color:'#6b6760',outline:'none',cursor:'pointer',fontFamily:'inherit' }}>
              {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}

          {selected.size > 0 && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,background:'#1a1916',color:'#fff',fontSize:12,marginLeft:8 }}>
              <span>{selected.size} selected</span>
              {[['Research All',()=>bulkAction('research')],['Generate Emails',()=>bulkAction('email')],['Delete',bulkDelete]].map(([l,fn]) => (
                <button key={l} onClick={fn} style={{ padding:'4px 10px',borderRadius:6,border:'0.5px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:11 }}>{l}</button>
              ))}
              <button onClick={()=>setSelected(new Set())} style={{ padding:'4px 10px',borderRadius:6,border:'0.5px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:11 }}>Cancel</button>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:12,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f0ede8' }}>
                  <th style={{ ...thStyle,cursor:'default',width:36 }}>
                    <input type="checkbox" checked={selected.size===leads.length&&leads.length>0}
                      onChange={e=>setSelected(e.target.checked?new Set(leads.map(l=>l.id)):new Set())}
                      style={{ width:14,height:14,cursor:'pointer',accentColor:'#1a1916' }} />
                  </th>
                  {[['company','Company'],['industry','Industry'],['volume','Volume'],['score','Score']].map(([f,l]) => (
                    <th key={f} style={thStyle} onClick={()=>handleSort(f)}>{l}{sortIcon(f)}</th>
                  ))}
                  <th style={thStyle}>Signal</th>
                  <th style={thStyle} onClick={()=>handleSort('status')}>Status{sortIcon('status')}</th>
                  <th style={thStyle} onClick={()=>handleSort('updated_at')}>Updated by{sortIcon('updated_at')}</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center',padding:'4rem',color:'#a09d98',fontSize:13 }}>
                    No leads yet — click <strong>+ Add Leads</strong> to get started.
                  </td></tr>
                ) : filtered.map(l => {
                  const sc = l.score ? scoreClass(l.score) : 'score-none'
                  const isRes = processing.has(l.id+'_research')
                  const isEml = processing.has(l.id+'_email')
                  return (
                    <tr key={l.id} style={{ borderBottom:'0.5px solid #e0dcd6' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#faf9f6'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 12px' }}>
                        <input type="checkbox" checked={selected.has(l.id)}
                          onChange={e=>{const s=new Set(selected);e.target.checked?s.add(l.id):s.delete(l.id);setSelected(s)}}
                          style={{ width:14,height:14,cursor:'pointer',accentColor:'#1a1916' }} />
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ fontWeight:500 }}>{l.company}</div>
                        <div style={{ fontSize:11,color:'#a09d98' }}>{[l.contact,l.title].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td style={{ padding:'10px 12px',color:'#6b6760' }}>{l.industry||'–'}</td>
                      <td style={{ padding:'10px 12px',color:'#6b6760',fontSize:12 }}>{l.volume||'–'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span className={`score-pill ${sc}`} style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:28,height:28,borderRadius:'50%',fontSize:12,fontWeight:500 }}>{l.score||'–'}</span>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ fontSize:11,color:'#6b6760',maxWidth:200,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{l.signal||'–'}</div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColor(l.status)}`} style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'3px 8px',borderRadius:4,letterSpacing:'0.02em' }}>{statusLabel(l.status)}</span>
                      </td>
                      <td style={{ padding:'10px 12px',fontSize:11,color:'#a09d98',fontStyle:'italic',whiteSpace:'nowrap' }}>{l.updated_by||'–'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex',gap:4 }}>
                          {[[isRes?'...':'Research',()=>researchLead(l),isRes,true],[isEml?'...':'Email',()=>generateEmail(l),isEml,true],['View',()=>setDetailLead(l),false,false],['✕',()=>deleteLead(l.id),false,false]].map(([label,fn,loading,isAI],i) => (
                            <button key={i} onClick={fn} disabled={loading}
                              style={{ fontSize:11,padding:'4px 9px',borderRadius:5,border:isAI?'0.5px solid #3b82f6':'0.5px solid #e0dcd6',color:isAI?'#1d4e89':'#6b6760',background:'transparent',cursor:loading?'default':'pointer',opacity:loading?0.5:1,fontFamily:'inherit' }}>
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

      {showAdd && <AddLeadModal onClose={()=>setShowAdd(false)} onAdd={saveLead} showToast={showToast} userName={userName} />}
      {detailLead && (
        <DetailPanel
          lead={leads.find(l=>l.id===detailLead.id)||detailLead}
          onClose={()=>setDetailLead(null)}
          onSave={saveLead}
          onDelete={deleteLead}
          onResearch={researchLead}
          onEmail={generateEmail}
          processing={processing}
          showToast={showToast}
        />
      )}

      {toast && (
        <div style={{ position:'fixed',bottom:'1.5rem',right:'1.5rem',background:'#1a1916',color:'#fff',padding:'10px 18px',borderRadius:8,fontSize:13,zIndex:999,maxWidth:320,fontFamily:'inherit' }}>{toast}</div>
      )}
    </div>
  )
}
