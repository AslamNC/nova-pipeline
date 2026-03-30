'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { uid } from '../../lib/utils'

const TYPES = ['linkedin_post','short_video','calculator','blog_post','twitter_thread','newsletter']
const TYPE_LABELS = { linkedin_post:'LinkedIn Post', short_video:'Short Video', calculator:'Calculator', blog_post:'Blog Post', twitter_thread:'Twitter Thread', newsletter:'Newsletter' }
const TYPE_COLORS = { linkedin_post:'#dbeafe #1d4e89', short_video:'#fee2e2 #991b1b', calculator:'#d8f3dc #2d6a4f', blog_post:'#fef3c7 #92400e', twitter_thread:'#e0f2fe #0369a1', newsletter:'#ede9fe #5b21b6' }

export default function E03() {
  const [pieces, setPieces] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [userName, setUserName] = useState('')
  useEffect(() => { setUserName(localStorage.getItem('nova_username') || 'Unknown') }, [])
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('content_pieces').select('*').order('added_at', { ascending: false })
      if (data) setPieces(data)
    }
    fetchData()
    const ch = supabase.channel('content_changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'content_pieces' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const savePiece = useCallback(async (p) => {
    setPieces(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx > -1) { const u = [...prev]; u[idx] = p; return u }
      return [p, ...prev]
    })
    const { id, ...data } = p
    data.updated_by = userName
    await supabase.from('content_pieces').upsert({ id, ...data })
  }, [userName])

  const deletePiece = async (id) => {
    setPieces(prev => prev.filter(p => p.id !== id))
    await supabase.from('content_pieces').delete().eq('id', id)
  }

  const addPiece = async () => {
    const get = id => document.getElementById(id)?.value?.trim() || ''
    const title = get('c-title')
    if (!title) { alert('Title is required.'); return }
    await savePiece({
      id: uid(), title, type: get('c-type')||'linkedin_post',
      publish_date: get('c-date')||new Date().toISOString().slice(0,10),
      url: get('c-url'), topic: get('c-topic'),
      views: 0, engagements: 0, demo_requests: 0, notes: '',
      added_at: new Date().toISOString()
    })
    showToast('Content piece added: ' + title)
    setShowAdd(false)
  }

  const updateMetric = (piece, field, val) => {
    const num = parseInt(val) || 0
    savePiece({ ...piece, [field]: num })
  }

  const stats = {
    pieces: pieces.length,
    views: pieces.reduce((s,p)=>s+(p.views||0),0),
    engagements: pieces.reduce((s,p)=>s+(p.engagements||0),0),
    demos: pieces.reduce((s,p)=>s+(p.demo_requests||0),0),
  }

  const bestPiece = pieces.reduce((best,p) => (!best || (p.demo_requests||0)>(best.demo_requests||0)) ? p : best, null)

  const inpStyle = { width:'100%',fontSize:13,padding:'8px 10px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#f5f4f0',outline:'none',fontFamily:'inherit' }
  const metricInput = (piece, field) => (
    <input type="number" min="0" defaultValue={piece[field]||0}
      onBlur={e=>updateMetric(piece, field, e.target.value)}
      style={{ width:70,fontSize:13,fontWeight:500,padding:'4px 8px',borderRadius:5,border:'0.5px solid #e0dcd6',background:'transparent',outline:'none',fontFamily:'inherit',textAlign:'center' }} />
  )

  const TOPIC_IDEAS = [
    '"You posted the same warehouse role 4x — here\'s why"',
    '"7-day time-to-screen is costing you $X per hire"',
    '"BPO hiring in 2026: why phone screens are broken"',
    '"What 100% annual attrition actually costs a contact center"',
    '"AI interviewing vs traditional screening — real numbers"',
  ]

  return (
    <div style={{ minHeight:'100vh',background:'#f5f4f0',fontFamily:"'DM Sans',sans-serif" }}>

      {/* TOPBAR */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',alignItems:'center',gap:'1rem',height:52,position:'sticky',top:0,zIndex:40 }}>
        <div>
          <div style={{ fontWeight:500,fontSize:14 }}>E03 · Inbound Content Tracker</div>
          <div style={{ fontSize:11,color:'#a09d98' }}>Track content that drives demo requests</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{ marginLeft:'auto',fontSize:12,padding:'7px 14px',borderRadius:8,border:'none',background:'#1a1916',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>+ Add Piece</button>
      </div>

      {/* STATS */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',overflowX:'auto' }}>
        {[['Pieces Published',stats.pieces],['Total Views',stats.views.toLocaleString()],['Engagements',stats.engagements.toLocaleString()],['Demo Requests',stats.demos]].map(([l,v],i,arr) => (
          <div key={l} style={{ padding:'10px 20px 10px 0',marginRight:i<arr.length-1?20:0,borderRight:i<arr.length-1?'0.5px solid #e0dcd6':'none',display:'flex',flexDirection:'column',gap:2,whiteSpace:'nowrap' }}>
            <div style={{ fontSize:20,fontWeight:500,lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.05em',textTransform:'uppercase' }}>{l}</div>
          </div>
        ))}
        <div style={{ marginLeft:'auto',display:'flex',flexDirection:'column',justifyContent:'center',padding:'10px 0',fontSize:12,color:'#a09d98' }}>
          Views→Demo rate: <strong style={{ color:'#1a1916' }}>{stats.views>0?((stats.demos/stats.views)*100).toFixed(2):0}%</strong>
        </div>
      </div>

      <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem' }}>

        {/* TOPIC IDEAS */}
        <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:10,padding:'14px 18px' }}>
          <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:10 }}>Topic ideas that intercept hiring pain</div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {TOPIC_IDEAS.map(t => (
              <span key={t} style={{ fontSize:11,padding:'4px 10px',borderRadius:5,border:'0.5px solid #e0dcd6',background:'#f5f4f0',color:'#6b6760',lineHeight:1.4 }}>{t}</span>
            ))}
          </div>
        </div>

        {bestPiece && (
          <div style={{ background:'#d8f3dc',border:'0.5px solid #a3d9b1',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:12 }}>
            <span style={{ fontSize:18 }}>⭐</span>
            <div>
              <div style={{ fontSize:11,color:'#2d6a4f',fontFamily:"'DM Mono',monospace",letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:2 }}>Best performing piece</div>
              <div style={{ fontSize:13,fontWeight:500,color:'#1a1916' }}>{bestPiece.title}</div>
              <div style={{ fontSize:11,color:'#2d6a4f' }}>{bestPiece.demo_requests} demo requests · {bestPiece.views} views</div>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:12,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f0ede8' }}>
                  {['Title','Type','Published','Topic','Views','Engagements','Demo Requests','Link',''].map(h => (
                    <th key={h} style={{ padding:'10px 12px',textAlign:'left',fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:400,borderBottom:'0.5px solid #e0dcd6',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pieces.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center',padding:'4rem',color:'#a09d98',fontSize:13 }}>
                    No content tracked yet — add pieces you've published and update metrics weekly.
                  </td></tr>
                ) : pieces.map(p => {
                  const [tbg, tc] = (TYPE_COLORS[p.type]||'#f0ede8 #9a9894').split(' ')
                  return (
                    <tr key={p.id} style={{ borderBottom:'0.5px solid #e0dcd6' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#faf9f6'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 12px',fontWeight:500,maxWidth:200 }}>
                        <div style={{ whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.title}</div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'2px 7px',borderRadius:3,background:tbg,color:tc,whiteSpace:'nowrap' }}>{TYPE_LABELS[p.type]||p.type}</span>
                      </td>
                      <td style={{ padding:'10px 12px',fontSize:12,color:'#6b6760',fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap' }}>{p.publish_date||'–'}</td>
                      <td style={{ padding:'10px 12px',fontSize:12,color:'#6b6760',maxWidth:160 }}>
                        <input defaultValue={p.topic||''} placeholder="Topic..."
                          onBlur={e=>savePiece({...p,topic:e.target.value})}
                          style={{ fontSize:12,padding:'3px 6px',border:'0.5px solid #e0dcd6',borderRadius:4,background:'transparent',outline:'none',fontFamily:'inherit',width:'100%' }} />
                      </td>
                      <td style={{ padding:'10px 12px',textAlign:'center' }}>{metricInput(p,'views')}</td>
                      <td style={{ padding:'10px 12px',textAlign:'center' }}>{metricInput(p,'engagements')}</td>
                      <td style={{ padding:'10px 12px',textAlign:'center' }}>
                        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                          {metricInput(p,'demo_requests')}
                          {(p.demo_requests||0)>0 && <div style={{ fontSize:9,color:'#2d6a4f',fontWeight:500 }}>+{p.demo_requests}</div>}
                        </div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        {p.url ? <a href={p.url} target="_blank" style={{ fontSize:11,color:'#3b82f6',textDecoration:'none' }}>View ↗</a> : '–'}
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <button onClick={()=>deletePiece(p.id)}
                          style={{ fontSize:11,padding:'4px 8px',borderRadius:5,border:'0.5px solid #e0dcd6',color:'#991b1b',background:'transparent',cursor:'pointer',fontFamily:'inherit' }}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      {showAdd && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
          <div style={{ background:'#fff',borderRadius:12,width:'100%',maxWidth:480,border:'0.5px solid #e0dcd6',padding:'1.5rem' }}>
            <div style={{ fontSize:16,fontWeight:500,marginBottom:16 }}>Add Content Piece</div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <div>
                <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>Title *</label>
                <input id="c-title" placeholder="e.g. You posted this role 4 times — here's why" style={inpStyle} />
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div>
                  <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>Type</label>
                  <select id="c-type" style={inpStyle}>
                    {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>Publish Date</label>
                  <input id="c-date" type="date" defaultValue={new Date().toISOString().slice(0,10)} style={inpStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>Topic / Hook</label>
                <input id="c-topic" placeholder="e.g. Time-to-hire, ghost candidates, cost per hire" style={inpStyle} />
              </div>
              <div>
                <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>URL (optional)</label>
                <input id="c-url" placeholder="https://linkedin.com/posts/..." style={inpStyle} />
              </div>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:20 }}>
              <button onClick={()=>setShowAdd(false)} style={{ fontSize:13,padding:'8px 16px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',color:'#6b6760',cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
              <button onClick={addPiece} style={{ fontSize:13,padding:'8px 16px',borderRadius:8,border:'none',background:'#1a1916',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Add Piece</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed',bottom:'1.5rem',right:'1.5rem',background:'#1a1916',color:'#fff',padding:'10px 18px',borderRadius:8,fontSize:13,zIndex:999,fontFamily:'inherit' }}>{toast}</div>}
    </div>
  )
}
