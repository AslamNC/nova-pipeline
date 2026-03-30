'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg> },
  { href: '/', label: 'Pipeline', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 4h13M1 7.5h13M1 11h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>, dividerAfter: true },
  { href: '/e01', label: 'E01 · Ops Outbound', tag: 'outbound', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { href: '/e02', label: 'E02 · Referrals', tag: 'referral', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L9.33 5.27L14 5.9l-3.25 3.17.77 4.43L7.5 11.27l-4.02 2.23.77-4.43L1 5.9l4.67-.63L7.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
  { href: '/e03', label: 'E03 · Inbound', tag: 'inbound', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M4 7l3.5 3.5L11 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 13h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
]

const tagColors = {
  outbound: { bg: '#dbeafe', color: '#1d4e89' },
  referral: { bg: '#ede9fe', color: '#5b21b6' },
  inbound: { bg: '#d8f3dc', color: '#2d6a4f' },
}

export default function Nav() {
  const path = usePathname()

  return (
    <div style={{ width: 220, minWidth: 220, background: '#ffffff', borderRight: '0.5px solid #e4e0da', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      <div style={{ padding: '18px 16px 14px', borderBottom: '0.5px solid #e4e0da' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: '#141412' }}>Nova</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#a09d98', marginTop: 2 }}>Growth OS · Peoplebox.ai</div>
      </div>

      <nav style={{ padding: '10px 8px', flex: 1 }}>
        {links.map((l, i) => {
          const active = l.href === '/' ? path === '/' : path.startsWith(l.href)
          return (
            <div key={l.href}>
              {l.dividerAfter && i < links.length - 1 && (
                <div style={{ height: '0.5px', background: '#e4e0da', margin: '8px 8px' }} />
              )}
              <Link href={l.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 7, background: active ? '#f0ede8' : 'transparent', color: active ? '#141412' : '#6b6760', marginBottom: 2, transition: 'background .12s, color .12s', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f5f4f0' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}>{l.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: active ? 500 : 400, flex: 1, lineHeight: 1.3 }}>{l.label}</span>
                  {l.tag && (
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", padding: '1px 5px', borderRadius: 3, ...tagColors[l.tag] }}>{l.tag}</span>
                  )}
                </div>
              </Link>
            </div>
          )
        })}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '0.5px solid #e4e0da' }}>
        <div style={{ fontSize: 10, color: '#c0bdb8', fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
          Built for Founder's Office<br />– Growth application
        </div>
      </div>
    </div>
  )
}
