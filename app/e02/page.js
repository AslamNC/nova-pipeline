'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { uid } from '../../lib/utils'

const ASK_STATUS = { pending:'PENDING', asked:'ASKED', intro_made:'INTRO MADE', declined:'DECLINED' }
const INTRO_STATUS = { pending:'PENDING', demo_booked:'DEMO BOOKED', closed:'CLOSED WON', lost:'LOST' }
const ASK_COLORS = { pending:'#f0ede8 #9a9894', asked:'#dbeafe #1d4e89', intro_made:'#ede9fe #5b21b6', declined:'#fee2e2 #991b1b' }
const INTRO_COLORS = { pending:'#f0ede8 #9a9894', demo_booked:'#fef3c7 #92400e', closed:'#d8f3dc #2d6a4f', lost:'#fee2e2 #991b1b' }

const pill = (label, colorStr) => {
  const [bg, color] = (colorStr||'#f0ede8 #9a9894').split(' ')
  return <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'3px 8px',borderRadius:4,background:bg,color }}>{label}</span>
}

export default function E02() {
  const [referrals, setReferrals] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [userName] = useState(() => localStorage.getItem('nova_username') || 'Unknown')
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('referrals').select('*').order('added_at', { ascending: false })
      if (data) setReferrals(data)
    }
    fetchData()
    const ch = supabase.channel('referrals_changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'referrals' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const saveReferral = useCallback(async (r) => {
    setReferrals(prev => {
      const idx = prev.findIndex(x => x.id === r.id)
      if (idx > -1) { const u = [...prev]; u[idx] = r; return u }
      return [r, ...prev]
    })
    const { id, ...data } = r
    data.updated_by = userName
    await supabase.from('referrals').upsert({ id, ...data })
  }, [userName])

  const deleteReferral = async (id) => {
    setReferrals(prev => prev.filter(r => r.id !== id))
    await supabase.from('referrals').delete().eq('id', id)
  }

  const addReferral = async () => {
    const get = id => document.getElementById(id)?.value?.trim() || ''
    const customer = get('r-customer')
    if (!customer) { alert('Customer company is required.'); return }
    await saveReferral({
      id: uid(), customer_company: customer, customer_contact: get('r-contact'),
      ask_date: get('r-date') || new Date().toISOString().slice(0,10),
      ask_status: 'pending', intro_to_company: '', intro_to_contact: '',
      intro_status: 'pending', notes: '', added_at: new Date().toISOString()
    })
    showToast('Referral added: ' + customer)
    setShowAdd(false)
  }

  const stats = {
    customers: referrals.length,
    asked: referrals.filter(r=>['asked','intro_made','declined'].includes(r.ask_status)).length,
    intros: referrals.filter(r=>r.ask_status==='intro_made').length,
    demos: referrals.filter(r=>['demo_booked','closed'].includes(r.intro_status)).length,
    closed: referrals.filter(r=>r.intro_status==='closed').length,
  }

  const inpStyle = { width:'100%',fontSize:13,padding:'8px 10px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#f5f4f0',outline:'none',fontFamily:'inherit' }
  const selStyle = { fontSize:11,fontFamily:"'DM Mono',monospace",padding:'3px 7px',borderRadius:4,border:'0.5px solid #e0dcd6',background:'#fff',outline:'none',cursor:'pointer' }

  return (
    <div style={{ minHeight:'100vh',background:'#f5f4f0',fontFamily:"'DM Sans',sans-serif" }}>

      {/* TOPBAR */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',alignItems:'center',gap:'1rem',height:52,position:'sticky',top:0,zIndex:40 }}>
        <div>
          <div style={{ fontWeight:500,fontSize:14 }}>E02 · Champion Referral Tracker</div>
          <div style={{ fontSize:11,color:'#a09d98' }}>Turn happy customers into warm intros</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{ marginLeft:'auto',fontSize:12,padding:'7px 14px',borderRadius:8,border:'none',background:'#1a1916',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>+ Add Customer</button>
      </div>

      {/* STATS */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',overflowX:'auto' }}>
        {[['Customers',stats.customers],['Referral Asked',stats.asked],['Intros Made',stats.intros],['Demos Booked',stats.demos],['Closed Won',stats.closed]].map(([l,v],i,arr) => (
          <div key={l} style={{ padding:'10px 20px 10px 0',marginRight:i<arr.length-1?20:0,borderRight:i<arr.length-1?'0.5px solid #e0dcd6':'none',display:'flex',flexDirection:'column',gap:2,whiteSpace:'nowrap' }}>
            <div style={{ fontSize:20,fontWeight:500,lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.05em',textTransform:'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem' }}>

        {/* GUIDE BOX */}
        <div style={{ background:'#ede9fe',border:'0.5px solid #c4b5fd',borderRadius:10,padding:'12px 16px',fontSize:12,color:'#5b21b6',lineHeight:1.6 }}>
          <strong>How to use:</strong> Add Nova's existing customers → Log when you ask for referrals → Track each intro they make → Mark demos booked and deals closed. One warm intro is worth 50 cold emails.
        </div>

        {/* TABLE */}
        <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:12,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f0ede8' }}>
                  {['Customer Company','Customer Contact','Ask Date','Ask Status','Intro To','Intro Status','Notes',''].map(h => (
                    <th key={h} style={{ padding:'10px 12px',textAlign:'left',fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:400,borderBottom:'0.5px solid #e0dcd6',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center',padding:'4rem',color:'#a09d98',fontSize:13 }}>
                    No customers tracked yet — add Nova's existing customers to start requesting referrals.
                  </td></tr>
                ) : referrals.map(r => (
                  <tr key={r.id} style={{ borderBottom:'0.5px solid #e0dcd6' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#faf9f6'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 12px',fontWeight:500 }}>{r.customer_company}</td>
                    <td style={{ padding:'10px 12px',color:'#6b6760' }}>{r.customer_contact||'–'}</td>
                    <td style={{ padding:'10px 12px',fontSize:12,color:'#6b6760',fontFamily:"'DM Mono',monospace" }}>{r.ask_date||'–'}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <select value={r.ask_status||'pending'} onChange={e=>saveReferral({...r,ask_status:e.target.value})} style={selStyle}>
                        {Object.entries(ASK_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <input defaultValue={r.intro_to_company||''} placeholder="Company name"
                        onBlur={e=>saveReferral({...r,intro_to_company:e.target.value})}
                        style={{ fontSize:12,padding:'4px 8px',border:'0.5px solid #e0dcd6',borderRadius:5,background:'transparent',outline:'none',fontFamily:'inherit',width:130 }} />
                      <div style={{ marginTop:2 }}>
                        <input defaultValue={r.intro_to_contact||''} placeholder="Contact name"
                          onBlur={e=>saveReferral({...r,intro_to_contact:e.target.value})}
                          style={{ fontSize:11,padding:'3px 8px',border:'0.5px solid #e0dcd6',borderRadius:5,background:'transparent',outline:'none',fontFamily:'inherit',color:'#6b6760',width:130 }} />
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <select value={r.intro_status||'pending'} onChange={e=>saveReferral({...r,intro_status:e.target.value})} style={selStyle}
                        disabled={r.ask_status!=='intro_made'}>
                        {Object.entries(INTRO_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <input defaultValue={r.notes||''} placeholder="Notes..."
                        onBlur={e=>saveReferral({...r,notes:e.target.value})}
                        style={{ fontSize:12,padding:'4px 8px',border:'0.5px solid #e0dcd6',borderRadius:5,background:'transparent',outline:'none',fontFamily:'inherit',width:140 }} />
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <button onClick={()=>deleteReferral(r.id)}
                        style={{ fontSize:11,padding:'4px 8px',borderRadius:5,border:'0.5px solid #e0dcd6',color:'#991b1b',background:'transparent',cursor:'pointer',fontFamily:'inherit' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      {showAdd && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
          <div style={{ background:'#fff',borderRadius:12,width:'100%',maxWidth:440,border:'0.5px solid #e0dcd6',padding:'1.5rem' }}>
            <div style={{ fontSize:16,fontWeight:500,marginBottom:16 }}>Add Customer</div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <div>
                <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>Customer Company *</label>
                <input id="r-customer" placeholder="e.g. Alorica" style={inpStyle} />
              </div>
              <div>
                <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>Contact Name</label>
                <input id="r-contact" placeholder="e.g. Marcus Reid, Director of Recruiting" style={inpStyle} />
              </div>
              <div>
                <label style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4 }}>Date to Ask</label>
                <input id="r-date" type="date" defaultValue={new Date().toISOString().slice(0,10)} style={inpStyle} />
              </div>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:20 }}>
              <button onClick={()=>setShowAdd(false)} style={{ fontSize:13,padding:'8px 16px',borderRadius:8,border:'0.5px solid #e0dcd6',background:'#fff',color:'#6b6760',cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
              <button onClick={addReferral} style={{ fontSize:13,padding:'8px 16px',borderRadius:8,border:'none',background:'#1a1916',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Add Customer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed',bottom:'1.5rem',right:'1.5rem',background:'#1a1916',color:'#fff',padding:'10px 18px',borderRadius:8,fontSize:13,zIndex:999,fontFamily:'inherit' }}>{toast}</div>}
    </div>
  )
}
