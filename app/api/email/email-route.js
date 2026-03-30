export async function POST(req) {
  try {
    const { company, contact, title, industry, volume, signal, customPrompt } = await req.json()
    const key = process.env.GOOGLE_API_KEY

    const prompt = `You are an SDR at Peoplebox.ai selling Nova — AI interviewer for high-volume hiring. Cuts time-to-hire 70%, screening cost 60%.

Write a cold email to: ${contact || 'Hiring Leader'}, ${title || 'TA Leader'} at ${company}.
Industry: ${industry || 'Unknown'}. Volume: ${volume || 'high-volume'}. Signal: ${signal || 'high-volume hiring company'}.
${customPrompt ? '\nExtra context: ' + customPrompt : ''}

Rules: 4-5 lines max. Sharp opening about their specific pain. One Nova benefit. Soft CTA. Peer-to-peer tone. Sign as: Abhinav, Peoplebox.ai

Respond ONLY as JSON with no markdown: {"subject":"...","body":"..."}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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
