export async function POST(req) {
  try {
    const { query, company, contact } = await req.json()
    const key = process.env.GOOGLE_API_KEY

    // Single contact email lookup
    if (company && contact) {
      const prompt = `Find the work email address and LinkedIn profile for:
Name: ${contact}
Company: ${company}

Search their LinkedIn, company website, press releases, conference bios, or any public source.

Respond ONLY as JSON with no markdown:
{"email":"...","email_confidence":"high|medium|low","linkedin":"...","title":"..."}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }]
          })
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.filter(p=>p.text)?.map(p=>p.text)?.join('\n') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
      if (s === -1 || e === -1) return Response.json({ email: '', email_confidence: 'low', linkedin: '', title: '' })
      return Response.json(JSON.parse(clean.slice(s, e + 1)))
    }

    // Bulk COO / VP Ops finder
    const prompt = `You are a B2B sales researcher. Search the web to find 8-10 real companies matching: "${query}"

For each company, find the COO, VP Operations, or Chief People Officer — the ops-level decision maker, NOT HR.

Search company websites, LinkedIn, press releases and news to find real named contacts.

For each return:
- company: real company name
- industry: sector
- contact: full real name (not a placeholder)
- title: exact title
- email: best-guess work email (firstname.lastname@domain.com pattern)
- linkedin: LinkedIn URL if found
- signal: 2 sentences on their operational hiring pain
- score: Nova fit 1-10
- confidence: email confidence high/medium/low

Respond ONLY as a JSON array with no markdown:
[{"company":"...","industry":"...","contact":"...","title":"...","email":"...","linkedin":"...","signal":"...","score":8,"confidence":"medium"}]`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }]
        })
      }
    )

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    const text = data.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)?.map(p => p.text)?.join('\n') || ''

    const clean = text.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('[')
    const end = clean.lastIndexOf(']')

    if (start === -1 || end === -1) throw new Error('No contacts found — try a different search query')

    let parsed
    try {
      parsed = JSON.parse(clean.slice(start, end + 1))
    } catch {
      const fixed = clean.slice(start, end + 1)
        .replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      parsed = JSON.parse(fixed)
    }

    return Response.json(parsed.filter(l => l && l.company && l.contact))
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
