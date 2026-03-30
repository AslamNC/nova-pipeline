export async function POST(req) {
  try {
    const { query } = await req.json()
    const key = process.env.GOOGLE_API_KEY

    const prompt = `You are a B2B sales researcher for Peoplebox.ai. Find 8-12 real companies matching: "${query}"

These should be strong prospects for Nova — an AI interviewer for high-volume, high-turnover hiring.

For each company return: company name, industry, volume (specific e.g. "2,000+ hires/mo"), location, signal (2 sentences of hiring pain/recent news), score (1-10 fit for Nova), scoreReason (1 sentence).

Respond ONLY as a JSON array with no markdown:
[{"company":"...","industry":"...","volume":"...","location":"...","signal":"...","score":8,"scoreReason":"..."}]`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('\n') || ''

    const clean = text.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('[')
    const end = clean.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No results found — try a more specific query')

    let parsed
    try {
      parsed = JSON.parse(clean.slice(start, end + 1))
    } catch {
      const fixed = clean.slice(start, end + 1)
        .replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      parsed = JSON.parse(fixed)
    }

    return Response.json(parsed.filter(l => l && l.company))
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
