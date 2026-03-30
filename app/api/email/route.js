import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { company, contact, title, industry, volume, signal } = await req.json()

    const prompt = `You are an SDR at Peoplebox.ai selling Nova — AI interviewer for high-volume hiring. Cuts time-to-hire 70%, screening cost 60%.

Write cold email to: ${contact || 'Hiring Leader'}, ${title || 'TA Leader'} at ${company}.
Industry: ${industry || 'Unknown'}. Volume: ${volume || 'high-volume'}. Signal: ${signal || 'high-volume hiring company'}.

Rules: 4-5 lines max. Sharp opening. One Nova benefit. Soft CTA. Peer-to-peer tone. Sign as: Abhinav, Peoplebox.ai

Respond ONLY as JSON: {"subject":"...","body":"..."}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json(parsed)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
