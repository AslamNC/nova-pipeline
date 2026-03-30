export async function POST(req) {
  try {
    const { company, industry, volume, location, signal } = await req.json()
    const key = process.env.GOOGLE_API_KEY

    const prompt = `You are a B2B sales researcher. Generate for this company:
1. hiring signal (2 sentences): specific realistic insight about their hiring challenges.
2. Nova fit score (1-10): how well Nova (AI interviewer for high-volume hiring) fits.
3. score reason (1 sentence).

Company: ${company}, Industry: ${industry || 'Unknown'}, Volume: ${volume || 'Unknown'}, Location: ${location || 'Unknown'}${signal ? ', Context: ' + signal : ''}

Respond ONLY as JSON with no markdown: {"signal":"...","score":8,"scoreReason":"..."}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    )

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
    const parsed = JSON.parse(clean.slice(s, e + 1))
    return Response.json(parsed)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
