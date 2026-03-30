'use client'
import { useState, useRef } from 'react'
import { uid } from '../lib/utils'

const CHIPS = [
  ['BPO / US', 'High-volume BPO contact centers US 2026'],
  ['Retail hiring', 'Large retail chains hiring store associates 2026'],
  ['Staffing agencies', 'Staffing agencies light industrial warehouse placements US'],
  ['Logistics', 'Logistics and delivery companies high attrition hiring US'],
  ['Healthcare staffing', 'Healthcare staffing firms high volume nurse hiring'],
  ['Security services', 'Security guard companies with high turnover US'],
]

export default function AddLeadModal({ onClose, onAdd, showToast, userName }) {
  const [tab, setTab] = useState('manual')
  const [csvLeads, setCsvLeads] = useState([])
  const [dragging, setDragging] = useState(false)
  const [finderQuery, setFinderQuery] = useState('')
  const [finderLoading, setFinderLoading] = useState(false)
  const [finderStatus, setFinderStatus] = useState('')
  const [foundLeads, setFoundLeads] = useState([])
  const [selectedFound, setSelectedFound] = useState(new Set())
  const [loaderMsg, setLoaderMsg] = useState('')
  const [loaderSecs, setLoaderSecs] = useState(0)
  const timerRef = useRef(null)

  const inputClass = "w-full text-sm px-3 py-2 rounded-lg outline-none"
  const inputStyle = { border: '0.5px solid #e0dcd6', background: '#f5f4f0', fontFamily: 'inherit' }

  const addManual = async () => {
    const company = document.getElementById('f-company').value.trim()
    if (!company) { alert('Company name is required.'); return }
    await onAdd({ id: uid(), company, contact: document.getElementById('f-contact').value.trim(), title: document.getElementById('f-title').value.trim(), contact_email: document.getElementById('f-email').value.trim(), industry: document.getElementById('f-industry').value.trim(), volume: document.getElementById('f-vol').value.trim(), location: document.getElementById('f-location').value.trim(), signal: document.getElementById('f-signal').value.trim(), status: 'new', added_at: new Date().toISOString() })
    showToast('Lead added: ' + company)
    onClose()
  }

  const addPaste = async () => {
    const lines = document.getElementById('f-paste').value.split('\n').map(l => l.trim()).filter(Boolean)
    const industry = document.getElementById('f-paste-industry').value.trim()
    if (!lines.length) { alert('Enter at least one company name.'); return }
    for (const company of lines) await onAdd({ id: uid(), company, industry, status: 'new', added_at: new Date().toISOString() })
    showToast(lines.length + ' leads added')
    onClose()
  }

  const processRows = (rows) => {
    const map = k => {
      const aliases = { company: ['company', 'company name', 'organization', 'account'], contact: ['contact', 'name', 'full name', 'first name'], title: ['title', 'job title', 'position', 'role'], contact_email: ['email', 'email address', 'work email'], industry: ['industry', 'sector'], volume: ['volume', 'hiring volume'], location: ['location', 'city', 'region', 'country'], signal: ['signal', 'notes', 'context', 'pain'] }
      for (const [f, keys] of Object.entries(aliases)) { if (keys.some(a => a === k.toLowerCase().trim())) return f }
      return null
    }
    const parsed = rows.map(row => {
      const lead = { id: uid(), status: 'new', added_at: new Date().toISOString() }
      for (const [k, v] of Object.entries(row)) { const f = map(k); if (f && v) lead[f] = String(v).trim() }
      if (!lead.company) lead.company = Object.values(row)[0] || 'Unknown'
      return lead
    }).filter(l => l.company && l.company !== 'Unknown')
    setCsvLeads(parsed)
  }

  const handleFile = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      import('papaparse').then(Papa => { Papa.default.parse(file, { header: true, skipEmptyLines: true, complete: r => processRows(r.data) }) })
    } else {
      import('xlsx').then(XLSX => {
        const reader = new FileReader()
        reader.onload = e => { const wb = XLSX.default.read(e.target.result, { type: 'array' }); processRows(XLSX.default.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])) }
        reader.readAsArrayBuffer(file)
      })
    }
  }

  const importCSV = async () => {
    if (!csvLeads.length) { alert('Upload a file first.'); return }
    for (const lead of csvLeads) await onAdd(lead)
    showToast(csvLeads.length + ' leads imported')
    onClose()
  }

  const findLeads = async (q) => {
    const query = q || finderQuery
    if (!query.trim()) { alert('Enter a search query.'); return }
    setFinderLoading(true); setFoundLeads([]); setSelectedFound(new Set()); setFinderStatus('')
    const msgs = ['Searching the web...', 'Reading hiring news...', 'Identifying companies...', 'Scoring fit for Nova...', 'Compiling results...']
    let secs = 0, mi = 0
    timerRef.current = setInterval(() => { secs++; setLoaderSecs(secs); if (secs % 4 === 0 && mi < msgs.length - 1) { mi++; setLoaderMsg(msgs[mi]) } }, 1000)
    setLoaderMsg(msgs[0]); setLoaderSecs(0)
    try {
      const res = await fetch('/api/find', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (!Array.isArray(data)) throw new Error('Unexpected response')
      setFoundLeads(data)
      setFinderStatus(data.length + ' companies found — select which to add:')
    } catch (e) { setFinderStatus('Error: ' + e.message) }
    finally { clearInterval(timerRef.current); setFinderLoading(false) }
  }

  const addFound = async () => {
    if (!selectedFound.size) { alert('Select at least one company.'); return }
    const toAdd = [...selectedFound].map(i => foundLeads[i])
    for (const l of toAdd) {
      await onAdd({ id: uid(), company: l.company, industry: l.industry, volume: l.volume, location: l.location, signal: l.signal, score: l.score, score_reason: l.scoreReason, status: 'researched', added_at: new Date().toISOString() })
    }
    showToast(toAdd.length + ' leads added')
    onClose()
  }

  const tabs = [['manual', 'Manual Entry'], ['csv', 'CSV / Excel'], ['paste', 'Paste List'], ['ai', '✦ AI Find']]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-xl w-full overflow-hidden" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', border: '0.5px solid #e0dcd6' }}>

        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10" style={{ borderBottom: '0.5px solid #e0dcd6' }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Add Leads</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#a09d98', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="px-6 pt-4">
          {/* TABS */}
          <div className="flex overflow-x-auto" style={{ borderBottom: '0.5px solid #e0dcd6', marginBottom: 20 }}>
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ fontSize: 12, padding: '8px 14px', border: 'none', borderBottom: tab === key ? '2px solid #1a1916' : '2px solid transparent', background: 'none', color: tab === key ? '#1a1916' : '#6b6760', cursor: 'pointer', fontWeight: tab === key ? 500 : 400, fontFamily: 'inherit', whiteSpace: 'nowrap', marginBottom: -0.5, ...(key === 'ai' ? { color: tab === 'ai' ? '#1d4e89' : '#3b82f6' } : {}) }}>
                {label}
              </button>
            ))}
          </div>

          {/* MANUAL */}
          {tab === 'manual' && (
            <div className="flex flex-col gap-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {[['f-company', 'Company *', 'e.g. Teleperformance USA'], ['f-industry', 'Industry', 'e.g. BPO / Call Center']].map(([id, label, ph]) => (
                  <div key={id}><label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a09d98', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input id={id} placeholder={ph} className={inputClass} style={inputStyle} /></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['f-contact', 'Contact Name', 'e.g. Jennifer Walsh'], ['f-title', 'Title', 'e.g. VP Talent Acquisition'], ['f-email', 'Email', 'jennifer@company.com'], ['f-vol', 'Hiring Volume', 'e.g. 2,000+ hires/mo']].map(([id, label, ph]) => (
                  <div key={id}><label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a09d98', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input id={id} placeholder={ph} className={inputClass} style={inputStyle} /></div>
                ))}
              </div>
              <div><label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a09d98', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Location</label>
                <input id="f-location" placeholder="e.g. United States" className={inputClass} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a09d98', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Notes / Signal</label>
                <textarea id="f-signal" placeholder="Any context about their hiring situation..." className={inputClass} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} /></div>
            </div>
          )}

          {/* CSV */}
          {tab === 'csv' && (
            <div className="pb-4">
              <div onClick={() => document.getElementById('fileInp').click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
                onDragLeave={() => setDragging(false)}
                className="rounded-lg p-8 text-center cursor-pointer"
                style={{ border: `1.5px dashed ${dragging ? '#3b82f6' : '#ccc8c2'}`, background: dragging ? '#dbeafe' : 'transparent', transition: 'all .15s' }}>
                <div style={{ fontSize: 28 }}>📂</div>
                <div style={{ fontWeight: 500, marginTop: 8 }}>Click to upload or drag & drop</div>
                <p style={{ fontSize: 13, color: '#6b6760', marginTop: 4 }}>CSV or Excel (.xlsx)</p>
              </div>
              <input type="file" id="fileInp" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              <div style={{ fontSize: 11, color: '#a09d98', marginTop: 10, lineHeight: 1.6 }}>Expected columns: <strong>company, contact, title, email, industry, volume, location, signal</strong></div>
              {csvLeads.length > 0 && <div style={{ fontSize: 12, color: '#2d6a4f', marginTop: 8 }}>{csvLeads.length} leads ready to import</div>}
            </div>
          )}

          {/* PASTE */}
          {tab === 'paste' && (
            <div className="pb-4 flex flex-col gap-3">
              <div><label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a09d98', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Company names (one per line)</label>
                <textarea id="f-paste" placeholder={"Teleperformance USA\nAlorica\nTTEC\nDollar General\n..."} className={inputClass} style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }} /></div>
              <div><label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a09d98', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Industry (applied to all)</label>
                <input id="f-paste-industry" placeholder="e.g. BPO / Call Center" className={inputClass} style={inputStyle} /></div>
            </div>
          )}

          {/* AI FIND */}
          {tab === 'ai' && (
            <div className="pb-4">
              <div className="flex gap-2 mb-3">
                <input value={finderQuery} onChange={e => setFinderQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && findLeads()}
                  placeholder="e.g. BPO companies in US hiring at scale 2026" className={inputClass} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => findLeads()} disabled={finderLoading}
                  className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#1a1916', border: 'none', cursor: finderLoading ? 'default' : 'pointer', opacity: finderLoading ? 0.6 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {finderLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CHIPS.map(([label, q]) => (
                  <button key={label} onClick={() => { setFinderQuery(q); findLeads(q) }}
                    className="text-xs px-3 py-1 rounded-full" style={{ border: '0.5px solid #e0dcd6', background: '#f0ede8', color: '#6b6760', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>

              {finderLoading && (
                <div className="text-center py-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="spinner" />
                    <span style={{ fontSize: 13, color: '#6b6760' }}>{loaderMsg}</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a09d98' }}>{loaderSecs}s elapsed · Claude is browsing live sources</div>
                </div>
              )}

              {finderStatus && <div style={{ fontSize: 12, color: '#a09d98', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>{finderStatus}</div>}

              {foundLeads.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2" style={{ fontSize: 12, color: '#6b6760' }}>
                    <input type="checkbox" style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#1a1916' }}
                      onChange={e => setSelectedFound(e.target.checked ? new Set(foundLeads.map((_, i) => i)) : new Set())} />
                    <label>Select all</label>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a09d98' }}>{selectedFound.size} selected</span>
                  </div>
                  <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 260 }}>
                    {foundLeads.map((l, i) => {
                      const scoreColors = { high: { bg: '#d8f3dc', color: '#2d6a4f' }, mid: { bg: '#fef3c7', color: '#92400e' }, low: { bg: '#fee2e2', color: '#991b1b' } }
                      const tier = l.score >= 7 ? 'high' : l.score >= 4 ? 'mid' : 'low'
                      return (
                        <div key={i} onClick={() => { const s = new Set(selectedFound); s.has(i) ? s.delete(i) : s.add(i); setSelectedFound(s) }}
                          className="flex gap-2 p-3 rounded-lg cursor-pointer"
                          style={{ border: `0.5px solid ${selectedFound.has(i) ? '#3b82f6' : '#e0dcd6'}`, background: selectedFound.has(i) ? '#dbeafe' : '#f5f4f0' }}>
                          <input type="checkbox" checked={selectedFound.has(i)} onChange={() => {}} style={{ width: 14, height: 14, accentColor: '#1a1916', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{l.company}</span>
                              <span style={{ ...scoreColors[tier], fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 20 }}>{l.score}/10</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#a09d98', marginTop: 2 }}>{[l.industry, l.volume, l.location].filter(Boolean).join(' · ')}</div>
                            <div style={{ fontSize: 12, color: '#6b6760', marginTop: 4, lineHeight: 1.5 }}>{l.signal}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end mt-3 pt-3" style={{ borderTop: '0.5px solid #e0dcd6' }}>
                    <button onClick={addFound} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#1a1916', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Add Selected to Pipeline
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        {tab !== 'ai' && (
          <div className="flex justify-end gap-2 px-6 py-3 sticky bottom-0 bg-white" style={{ borderTop: '0.5px solid #e0dcd6' }}>
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg" style={{ border: '0.5px solid #e0dcd6', background: '#fff', color: '#6b6760', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={tab === 'manual' ? addManual : tab === 'csv' ? importCSV : addPaste}
              className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: '#1a1916', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {tab === 'csv' ? 'Import Leads' : tab === 'paste' ? 'Add All' : 'Add Lead'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
