'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = (label, value, sub, color='#1a1916') => (
  <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:10,padding:'14px 16px' }}>
    <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:26,fontWeight:500,color,lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11,color:'#a09d98',marginTop:4 }}>{sub}</div>}
  </div>
)

const funnel = (steps) => (
  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
    {steps.map(([label, val, color], i) => (
      <div key={label}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3 }}>
          <span style={{ fontSize:12,color:'#6b6760' }}>{label}</span>
          <span style={{ fontSize:13,fontWeight:500 }}>{val}</span>
        </div>
        <div style={{ height:5,borderRadius:3,background:'#f0ede8',overflow:'hidden' }}>
          <div style={{ height:'100%',borderRadius:3,background:color,width:`${Math.min((val/(steps[0][1]||1))*100,100)}%`,transition:'width .4s' }} />
        </div>
      </div>
    ))}
  </div>
)

export default function Dashboard() {
  const [leads, setLeads] = useState([])
  const [contacts, setContacts] = useState([])
  const [referrals, setReferrals] = useState([])
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [l, c, r, ct] = await Promise.all([
        supabase.from('leads').select('status,score,added_at'),
        supabase.from('ops_contacts').select('status,added_at').then(r => r.data || []).catch(() => []),
        supabase.from('referrals').select('ask_status,intro_status,added_at').then(r => r.data || []).catch(() => []),
        supabase.from('content_pieces').select('demo_requests,views,engagements,added_at').then(r => r.data || []).catch(() => []),
      ])
      setLeads(l.data || [])
      setContacts(c)
      setReferrals(r)
      setContent(ct)
      setLoading(false)
    }
    load()
  }, [])

  // Pipeline stats
  const pl = {
    total: leads.length,
    researched: leads.filter(l=>['researched','ready','sent','replied'].includes(l.status)).length,
    ready: leads.filter(l=>l.status==='ready').length,
    sent: leads.filter(l=>l.status==='sent').length,
    replied: leads.filter(l=>l.status==='replied').length,
  }

  // E01 stats
  const e01 = {
    total: contacts.length,
    contacted: contacts.filter(c=>['contacted','replied','meeting'].includes(c.status)).length,
    replied: contacts.filter(c=>['replied','meeting'].includes(c.status)).length,
    meeting: contacts.filter(c=>c.status==='meeting').length,
  }

  // E02 stats
  const e02 = {
    total: referrals.length,
    asked: referrals.filter(r=>['asked','intro_made','declined'].includes(r.ask_status)).length,
    intros: referrals.filter(r=>r.intro_status&&r.intro_status!=='pending').length,
    demos: referrals.filter(r=>['demo_booked','closed'].includes(r.intro_status)).length,
    closed: referrals.filter(r=>r.intro_status==='closed').length,
  }

  // E03 stats
  const e03 = {
    pieces: content.length,
    views: content.reduce((s,c)=>s+(c.views||0),0),
    engagements: content.reduce((s,c)=>s+(c.engagements||0),0),
    demos: content.reduce((s,c)=>s+(c.demo_requests||0),0),
  }

  const totalDemos = e01.meeting + e02.demos + e03.demos

  const sectionTitle = (label, tag, tagColor) => (
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:16 }}>
      <div style={{ fontSize:14,fontWeight:500 }}>{label}</div>
      <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'2px 8px',borderRadius:3,...tagColor }}>{tag}</span>
    </div>
  )

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#a09d98',fontSize:13 }}>Loading...</div>
  )

  return (
    <div style={{ minHeight:'100vh',background:'#f5f4f0',fontFamily:"'DM Sans',sans-serif" }}>

      {/* TOPBAR */}
      <div style={{ background:'#fff',borderBottom:'0.5px solid #e0dcd6',padding:'0 1.5rem',display:'flex',alignItems:'center',height:52,position:'sticky',top:0,zIndex:40 }}>
        <div style={{ fontWeight:500,fontSize:14 }}>Growth Dashboard</div>
        <div style={{ marginLeft:'auto',fontSize:11,color:'#a09d98',fontFamily:"'DM Mono',monospace" }}>All experiments · live view</div>
      </div>

      <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1.5rem' }}>

        {/* TOP METRICS */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10 }}>
          {card('Total Pipeline', pl.total, `${pl.replied} replied`)}
          {card('E01 Contacts', e01.total, `${e01.meeting} meetings booked`, '#1d4e89')}
          {card('E02 Referral Intros', e02.intros, `${e02.closed} closed`, '#5b21b6')}
          {card('E03 Content Demos', e03.demos, `from ${e03.pieces} pieces`, '#2d6a4f')}
        </div>

        {/* Combined demos */}
        <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:10,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'2rem',flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4 }}>Total demos across all experiments</div>
            <div style={{ fontSize:32,fontWeight:500 }}>{totalDemos}</div>
          </div>
          <div style={{ display:'flex',gap:'2rem',flexWrap:'wrap' }}>
            {[['E01 Ops Outbound', e01.meeting, '#3b82f6'],['E02 Referrals', e02.demos, '#8b5cf6'],['E03 Inbound', e03.demos, '#10b981']].map(([l,v,c]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:22,fontWeight:500,color:c }}>{v}</div>
                <div style={{ fontSize:11,color:'#a09d98',marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* THREE EXPERIMENT COLUMNS */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12 }}>

          {/* E01 */}
          <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:12,padding:'20px' }}>
            {sectionTitle('E01 · Ops Outbound','outbound',{background:'#dbeafe',color:'#1d4e89'})}
            <div style={{ fontSize:12,color:'#6b6760',marginBottom:16,lineHeight:1.6 }}>
              Finding COOs and VP Ops at high-volume hiring companies. Ops-framed messaging, not HR.
            </div>
            {funnel([
              ['Contacts found', e01.total, '#3b82f6'],
              ['Contacted', e01.contacted, '#60a5fa'],
              ['Replied', e01.replied, '#93c5fd'],
              ['Meeting booked', e01.meeting, '#bfdbfe'],
            ])}
            <div style={{ marginTop:16,paddingTop:14,borderTop:'0.5px solid #e0dcd6',fontSize:11,color:'#a09d98' }}>
              Reply rate: <strong style={{ color:'#1a1916' }}>{e01.contacted>0?Math.round((e01.replied/e01.contacted)*100):0}%</strong>
              &nbsp;·&nbsp;Meeting rate: <strong style={{ color:'#1a1916' }}>{e01.replied>0?Math.round((e01.meeting/e01.replied)*100):0}%</strong>
            </div>
          </div>

          {/* E02 */}
          <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:12,padding:'20px' }}>
            {sectionTitle('E02 · Referrals','referral',{background:'#ede9fe',color:'#5b21b6'})}
            <div style={{ fontSize:12,color:'#6b6760',marginBottom:16,lineHeight:1.6 }}>
              Turning happy customers into warm intros. One intro closes faster than 50 cold emails.
            </div>
            {funnel([
              ['Customers tracked', e02.total, '#8b5cf6'],
              ['Referral asked', e02.asked, '#a78bfa'],
              ['Intro made', e02.intros, '#c4b5fd'],
              ['Demo booked', e02.demos, '#ddd6fe'],
              ['Closed', e02.closed, '#ede9fe'],
            ])}
            <div style={{ marginTop:16,paddingTop:14,borderTop:'0.5px solid #e0dcd6',fontSize:11,color:'#a09d98' }}>
              Ask → intro: <strong style={{ color:'#1a1916' }}>{e02.asked>0?Math.round((e02.intros/e02.asked)*100):0}%</strong>
              &nbsp;·&nbsp;Intro → demo: <strong style={{ color:'#1a1916' }}>{e02.intros>0?Math.round((e02.demos/e02.intros)*100):0}%</strong>
            </div>
          </div>

          {/* E03 */}
          <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:12,padding:'20px' }}>
            {sectionTitle('E03 · Inbound Content','inbound',{background:'#d8f3dc',color:'#2d6a4f'})}
            <div style={{ fontSize:12,color:'#6b6760',marginBottom:16,lineHeight:1.6 }}>
              Content targeting hiring managers at the frustration moment — ghost candidates, reposted roles.
            </div>
            {funnel([
              ['Pieces published', e03.pieces, '#10b981'],
              ['Total views', e03.views, '#34d399'],
              ['Engagements', e03.engagements, '#6ee7b7'],
              ['Demo requests', e03.demos, '#a7f3d0'],
            ])}
            <div style={{ marginTop:16,paddingTop:14,borderTop:'0.5px solid #e0dcd6',fontSize:11,color:'#a09d98' }}>
              Views → demo: <strong style={{ color:'#1a1916' }}>{e03.views>0?((e03.demos/e03.views)*100).toFixed(1):0}%</strong>
              &nbsp;·&nbsp;Demos per piece: <strong style={{ color:'#1a1916' }}>{e03.pieces>0?(e03.demos/e03.pieces).toFixed(1):0}</strong>
            </div>
          </div>
        </div>

        {/* EXPERIMENT NOTES */}
        <div style={{ background:'#fff',border:'0.5px solid #e0dcd6',borderRadius:10,padding:'16px 20px' }}>
          <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'#a09d98',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:10 }}>Experiment hypotheses</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16 }}>
            {[
              ['E01','3–4× reply rate targeting Ops vs HR persona. 500 contacts over 3 weeks.','#dbeafe','#1d4e89'],
              ['E02','10 customers × 2 intros = 20 warm demos, 3–4 closes.','#ede9fe','#5b21b6'],
              ['E03','5–10 inbound demo requests/week within 30 days of consistent publishing.','#d8f3dc','#2d6a4f'],
            ].map(([tag,text,bg,color]) => (
              <div key={tag} style={{ display:'flex',gap:10,alignItems:'flex-start' }}>
                <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",padding:'2px 7px',borderRadius:3,background:bg,color,flexShrink:0,marginTop:1 }}>{tag}</span>
                <div style={{ fontSize:12,color:'#6b6760',lineHeight:1.6 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
