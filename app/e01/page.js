'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { uid } from '../../lib/utils'

const STATUS_OPTS = ['new','contacted','replied','meeting']
const STATUS_LABELS = { new:'NEW', contacted:'CONTACTED', replied:'REPLIED', meeting:'MEETING BOOKED' }
const STATUS_COLORS = {
  new:'#f0ede8 #9a9894',contacted:'#dbeafe #1d4e89',replied:'#fef3c7 #92400e',meeting:'#d8f3dc #2d6a4f'
}

const CHIPS = [
  ['BPO / US COOs','COO VP Operations BPO contact center companies United States 2026'],
  ['Logistics Ops','VP Operations logistics delivery companies high attrition US'],
  ['Staffing Ops VPs','VP Operations staffing agency light industrial US'],
  ['Retail Ops Leaders','VP Store Operations large retail chains hiring US 2026'],
  ['Security Ops','VP Operations security guard companies US high volume hiring'],
]

export default function E01() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [foundContacts, setFoundContacts] = useState([])
  const [selectedFound, setSelectedFound] = useState(new Set())
  const [finderStatus, setFinderStatus] = useState('')
  const [loaderMsg, setLoaderMsg] = useState('')
  const [loaderSecs, setLoaderSecs] = useState(0)
  const [showFinder, setShowFinder] = useState(false)
  const [detail, setDetail] = useState(null)
  const [toast, setToast] = useState('')
  const [processing, setProcessing] = useState(new Set())
  const [userName, setUserName] = useState('')
  useEffect(() => { setUserName(localStorage.getItem('nova_username') || 'Unknown') }, [])
  const timerRef = useRef(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }, [])

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('ops_contacts').select('*').order('added_at', { ascending: false })
      if (data) setContacts(data)
    }
    fetch()
    const ch = supabase.channel('ops_contacts_changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'ops_contacts' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const saveContact = useCallback(async (c) => {
    setContacts(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx > -1) { const u = [...prev]; u[idx] = c; return u }
      return [c, ...prev]
    })
    const { id, ...data } = c
    data.updated_by = userName
    data.updated_at = new Date().toISOString()
    await supabase.from('ops_contacts').upsert({ id, ...data })
  }, [userName])

  const deleteContact = async (id) => {
    setContacts(prev => prev.filter(c => c.id !== id))
    await supabase.from('ops_contacts').delete().eq('id', id)
    if (detail?.id === id) setDetail(null)
  }

  const generateEmail = async (c) => {
    setProcessing(p => new Set([...p, c.id]))
    try {
      const res = await fetch('/api/email', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ company: c.company, contact: c.contact, title: c.title, industry: c.industry, signal: c.signal,
          customPrompt: `This is an Ops-persona email. The recipient is ${c.title} — an operations leader, NOT an HR person. Frame Nova as a business continuity tool that prevents SLA misses and revenue loss, not as an HR tool.` }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await saveContact({ ...c, email_subject: data.subject, email_body: data.body })
      showToast('Email ready: ' + c.company)
    } catch(e) { showToast('Error: ' + e.message) }
    finally { setProcessing(p => { const n = new Set(p); n.delete(c.id); return n }) }
  }

  const findContacts = async (q) => {
    const query = q || document.getElementById('finderQ')?.value?.trim()
    if (!query) return
    setLoading(true); setFoundContacts([]); setSelectedFound(new Set()); setFinderStatus('')
    const msgs = ['Searching for ops leaders...','Checking company websites...','Finding contact details...','Estimating email patterns...','Compiling results...']
    let secs = 0, mi = 0
    timerRef.current = setInterval(() => {
      secs++; setLoaderSecs(secs)
      if (secs % 5 === 0 && mi < msgs.length-1) { mi++; setLoaderMsg(msgs[mi]) }
    }, 1000)
    setLoaderMsg(msgs[0]); setLoaderSecs(0)
    try {
      const res = await fetch('/api/find-contacts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (!Array.isArray(data)) throw new Error('Unexpected response')
      setFoundContacts(data)
      setFinderStatus(data.length + ' contacts found')
    } catch(e) { setFinderStatus('Error: ' + e.message) }
    finally { clearInterval(timerRef.current); setLoading(false) }
  }

  const addFoundContacts = async () => {
    if (!selectedFound.size) { alert('Select at least one contact.'); return }
    const toAdd = [...selectedFound].map(i => foundContacts[i])
    for (const c of toAdd) {
      await saveContact({ id: uid(), company: c.company, industry: c.industry, contact: c.contact, title: c.title,
        email_guess: c.email, linkedin: c.linkedin, signal: c.signal, score: c.score,
        email_confidence: c.confidence, status: 'new', added_at: new Date().toISOString() })
    }
    showToast(toAdd.length + ' contacts added')
    setShowFinder(false); setFoundContacts([]); setSelectedFound(new Set())
  }

  const filtered = contacts.filter(c => {
    if (search && !(c.company||'').toLowerCase().includes(search.toLowerCase()) && !(c.contact||'').toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && c.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: contacts.length,
    contacted: contacts.filter(c=>['contacted','replied','meeting'].includes(c.status)).length,
    replied: contacts.filter(c=>['replied','meeting'].includes(c.status)).length,
    meeting: contacts.filter(c=>c.status==='meeting').length,
  }

  const confColor = { high:'#2d6a4f', medium:'#92400e', low:'#991b1b' }
  const confBg = { high:'#d8f3dc', medium:'#fef3c7', low:'#fee2e2' }

  return (
    <div style={{ minHeight:'100vh',background:'#f5f4f0',fontFamily:"'DM Sans',sans-serif" }}>

      {/* TOPBAR */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',alignItems:'center',gap:'1rem',height:52,position:'sticky',top:0,zIndex:40 }}>
        <div>
          <div style={{ fontWeight:500,fontSize:14 }}>E01 · Ops Persona Outbound</div>
          <div style={{ fontSize:11,color:'#a09d98' }}>COO & VP Ops contacts — ops-framed messaging</div>
        </div>
        <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
          <button onClick={() => setShowFinder(true)} style={{ fontSize:12,padding:'7px 14px',borderRadius:8,border:'none',background:'#1d4e89',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>✦ Find Contacts</button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',overflowX:'auto' }}>
        {[['Contacts',stats.total],['Contacted',stats.contacted],['Replied',stats.replied],['Meeting Booked',stats.meeting]].map(([l,v],i,arr) => (
          <div key={l} style={{ padding:'10px 20px 10px 0',marginRight:i<arr.length-1?20:0,borderRight:i<arr.length-1?'0.5px solid #e0dcd6':'none',display:'flex',flexDirection:'column',gap:2,whiteSpace:'nowrap' }}>
            <div style={{ fontSize:20,fontWeight:500,lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.05em',textTransform:'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem' }}>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or contact..."
            style={{ fontSize:13,padding:'7px 12px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',outline:'none',width:220,fontFamily:'inherit' }} />
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ fontSize:12,padding:'7px 10px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',color:'#6b6760',outline:'none',cursor:'pointer',fontFamily:'inherit' }}>
            <option value="">All statuses</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>

        <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:12,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f0ede8' }}>
                  {['Company','Contact','Title','Email (guess)','Signal','Confidence','Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 12px',textAlign:'left',fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:400,borderBottom:'0.5px solid #e0dcd6',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center',padding:'4rem',color:'#a09d98',fontSize:13 }}>
                    No contacts yet — click <strong>✦ Find Contacts</strong> to find COO/VP Ops leads.
                  </td></tr>
                ) : filtered.map(c => {
                  const [sbg, sc] = (STATUS_COLORS[c.status]||'#f0ede8 #9a9894').split(' ')
                  const isProcessing = processing.has(c.id)
                  return (
                    <tr key={c.id} style={{ borderBottom:'0.5px solid #e0dcd6' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#faf9f6'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ fontWeight:500 }}>{c.company}</div>
                        <div style={{ fontSize:11,color:'#a09d98' }}>{c.industry||''}</div>
                      </td>
                      <td style={{ padding:'10px 12px',fontWeight:500 }}>{c.contact||'–'}</td>
                      <td style={{ padding:'10px 12px',fontSize:12,color:'#6b6760' }}>{c.title||'–'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#6b6760' }}>{c.email_guess||'–'}</div>
                        {c.linkedin && <a href={c.linkedin} target="_blank" style={{ fontSize:10,color:'#3b82f6',textDecoration:'none' }}>LinkedIn ↗</a>}
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ fontSize:11,color:'#6b6760',maxWidth:180,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{c.signal||'–'}</div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        {c.email_confidence && (
                          <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'2px 7px',borderRadius:3,background:confBg[c.email_confidence]||'#f0ede8',color:confColor[c.email_confidence]||'#9a9894' }}>{c.email_confidence}</span>
                        )}
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <select value={c.status||'new'} onChange={e=>saveContact({...c,status:e.target.value})}
                          style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'3px 7px',borderRadius:4,border:'0.5px solid #e0dcd6',background:sbg,color:sc,outline:'none',cursor:'pointer' }}>
                          {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex',gap:4 }}>
                          <button onClick={()=>generateEmail(c)} disabled={isProcessing}
                            style={{ fontSize:11,padding:'4px 9px',borderRadius:5,border:'0.5px solid #3b82f6',color:'#1d4e89',background:'transparent',cursor:isProcessing?'default':'pointer',opacity:isProcessing?0.5:1,fontFamily:'inherit' }}>
                            {isProcessing?'...':'Email'}
                          </button>
                          <button onClick={()=>setDetail(c)}
                            style={{ fontSize:11,padding:'4px 9px',borderRadius:5,border:'0.5px solid #e0dcd6',color:'#6b6760',background:'transparent',cursor:'pointer',fontFamily:'inherit' }}>View</button>
                          <button onClick={()=>deleteContact(c.id)}
                            style={{ fontSize:11,padding:'4px 9px',borderRadius:5,border:'0.5px solid #e0dcd6',color:'#991b1b',background:'transparent',cursor:'pointer',fontFamily:'inherit' }}>✕</button>
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

      {/* FINDER MODAL */}
      {showFinder && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
          <div style={{ background:'#fff',borderRadius:12,width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto',border:'0.5px solid #e0dcd6' }}>
            <div style={{ padding:'1.25rem 1.5rem',borderBottom:'0.5px solid #e0dcd6',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff' }}>
              <div style={{ fontWeight:500,fontSize:15 }}>Find Ops Contacts</div>
              <button onClick={()=>setShowFinder(false)} style={{ background:'none',border:'none',fontSize:18,color:'#a09d98',cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:'1.5rem' }}>
              <div style={{ display:'flex',gap:8,marginBottom:12 }}>
                <input id="finderQ" defaultValue={query} placeholder="e.g. COO VP Ops BPO contact centers US 2026"
                  style={{ flex:1,fontSize:13,padding:'9px 12px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#f5f4f0',outline:'none',fontFamily:'inherit' }}
                  onKeyDown={e=>e.key==='Enter'&&findContacts()} />
                <button onClick={()=>findContacts()} disabled={loading}
                  style={{ padding:'9px 18px',borderRadius:8,border:'none',background:'#1d4e89',color:'#fff',cursor:loading?'default':'pointer',opacity:loading?0.6:1,fontFamily:'inherit',fontSize:12,whiteSpace:'nowrap' }}>
                  {loading?'Searching...':'Search'}
                </button>
              </div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:16 }}>
                {CHIPS.map(([l,q]) => (
                  <button key={l} onClick={()=>{ document.getElementById('finderQ').value=q; findContacts(q) }}
                    style={{ fontSize:11,padding:'4px 10px',borderRadius:20,border:'0.5px solid #e0dcd6',background:'#f0ede8',color:'#6b6760',cursor:'pointer',fontFamily:'inherit' }}>{l}</button>
                ))}
              </div>

              {loading && (
                <div style={{ textAlign:'center',padding:'2rem 0' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:8 }}>
                    <div style={{ width:18,height:18,border:'2px solid #e0dcd6',borderTopColor:'#3b82f6',borderRadius:'50%',animation:'spin .7s linear infinite' }} />
                    <span style={{ fontSize:13,color:'#6b6760' }}>{loaderMsg}</span>
                  </div>
                  <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98' }}>{loaderSecs}s elapsed</div>
                </div>
              )}

              {finderStatus && <div style={{ fontSize:12,color:'#a09d98',fontFamily:"'DM Mono',monospace",marginBottom:10 }}>{finderStatus}</div>}

              {foundContacts.length > 0 && (
                <>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8,fontSize:12,color:'#6b6760' }}>
                    <input type="checkbox" style={{ width:14,height:14,accentColor:'#1a1916',cursor:'pointer' }}
                      onChange={e=>setSelectedFound(e.target.checked?new Set(foundContacts.map((_,i)=>i)):new Set())} />
                    <label>Select all</label>
                    <span style={{ marginLeft:'auto',fontSize:11,color:'#a09d98' }}>{selectedFound.size} selected</span>
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto' }}>
                    {foundContacts.map((c,i) => (
                      <div key={i} onClick={()=>{const s=new Set(selectedFound);s.has(i)?s.delete(i):s.add(i);setSelectedFound(s)}}
                        style={{ display:'flex',gap:10,padding:'12px',borderRadius:8,border:`0.5px solid ${selectedFound.has(i)?'#3b82f6':'#e0dcd6'}`,background:selectedFound.has(i)?'#eff6ff':'#f5f4f0',cursor:'pointer' }}>
                        <input type="checkbox" checked={selectedFound.has(i)} onChange={()=>{}} style={{ width:14,height:14,accentColor:'#1a1916',flexShrink:0,marginTop:2 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:2 }}>
                            <span style={{ fontSize:13,fontWeight:500 }}>{c.contact}</span>
                            <span style={{ fontSize:11,color:'#6b6760' }}>{c.title}</span>
                            <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'1px 6px',borderRadius:3,background:confBg[c.confidence]||'#f0ede8',color:confColor[c.confidence]||'#9a9894',marginLeft:'auto' }}>{c.confidence}</span>
                          </div>
                          <div style={{ fontSize:12,fontWeight:500,color:'#1a1916' }}>{c.company} <span style={{ fontWeight:400,color:'#a09d98' }}>· {c.industry}</span></div>
                          <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#6b6760',marginTop:3 }}>{c.email}</div>
                          <div style={{ fontSize:12,color:'#6b6760',marginTop:4,lineHeight:1.5 }}>{c.signal}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex',justifyContent:'flex-end',marginTop:14,paddingTop:12,borderTop:'0.5px solid #e0dcd6' }}>
                    <button onClick={addFoundContacts} style={{ padding:'8px 18px',borderRadius:8,border:'none',background:'#1a1916',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:13 }}>
                      Add Selected ({selectedFound.size})
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {detail && (
        <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',justifyContent:'flex-end' }}>
          <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.2)' }} onClick={()=>setDetail(null)} />
          <div style={{ position:'relative',width:480,maxWidth:'95vw',background:'#fff',height:'100%',overflowY:'auto',borderLeft:'0.5px solid #e0dcd6' }}>
            <div style={{ padding:'1.25rem 1.5rem',borderBottom:'0.5px solid #e0dcd6',position:'sticky',top:0,background:'#fff',zIndex:10,display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:17,fontWeight:500 }}>{detail.contact}</div>
                <div style={{ fontSize:12,color:'#6b6760',marginTop:3 }}>{detail.title} · {detail.company}</div>
              </div>
              <button onClick={()=>setDetail(null)} style={{ background:'none',border:'none',fontSize:18,color:'#a09d98',cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1.25rem' }}>
              {[['Company',detail.company],['Industry',detail.industry],['Email (guess)',detail.email_guess],['LinkedIn',detail.linkedin],['Signal',detail.signal]].map(([l,v]) => v ? (
                <div key={l}>
                  <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5 }}>{l}</div>
                  <div style={{ fontSize:13,color:'#1a1916',lineHeight:1.6 }}>{l==='LinkedIn'?<a href={v} target="_blank" style={{ color:'#3b82f6' }}>{v}</a>:v}</div>
                </div>
              ) : null)}
              {detail.email_subject && (
                <div>
                  <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5 }}>Generated email</div>
                  <div style={{ background:'#f5f4f0',border:'0.5px solid #e0dcd6',borderRadius:8,padding:'12px 14px' }}>
                    <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500,marginBottom:8,paddingBottom:8,borderBottom:'0.5px solid #e0dcd6' }}>Subject: {detail.email_subject}</div>
                    <div style={{ fontSize:13,lineHeight:1.75,whiteSpace:'pre-wrap' }}>{detail.email_body}</div>
                  </div>
                </div>
              )}
              <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                <button onClick={()=>generateEmail(detail)} style={{ fontSize:12,padding:'7px 14px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Generate Email</button>
                {detail.email_body && <button onClick={()=>{navigator.clipboard.writeText('Subject: '+detail.email_subject+'\n\n'+detail.email_body);showToast('Copied!')}} style={{ fontSize:12,padding:'7px 14px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Copy Email</button>}
                <button onClick={()=>deleteContact(detail.id)} style={{ fontSize:12,padding:'7px 14px',borderRadius:8,border:'0.5px solid #e0dcd6',color:'#991b1b',background:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Delete</button>
              </div>
              <div>
                <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5 }}>Notes</div>
                <textarea defaultValue={detail.notes||''} onChange={e=>saveContact({...detail,notes:e.target.value})} placeholder="Add notes..."
                  style={{ width:'100%',fontSize:13,padding:'10px 12px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#f5f4f0',outline:'none',resize:'vertical',minHeight:80,lineHeight:1.6,fontFamily:'inherit' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed',bottom:'1.5rem',right:'1.5rem',background:'#1a1916',color:'#fff',padding:'10px 18px',borderRadius:8,fontSize:13,zIndex:999,fontFamily:'inherit' }}>{toast}</div>}
    </div>
  )
}
