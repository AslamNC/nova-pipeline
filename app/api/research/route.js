import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { company, industry, volume, location, signal } = await req.json()

    const prompt = `You are a B2B sales researcher. Generate for this company:
1. hiring signal (2 sentences): specific realistic insight about their hiring challenges.
2. Nova fit score (1-10): how well Nova (AI interviewer for high-volume hiring) fits.
3. score reason (1 sentence).

Company: ${company}, Industry: ${industry || 'Unknown'}, Volume: ${volume || 'Unknown'}, Location: ${location || 'Unknown'}${signal ? ', Context: ' + signal : ''}

Respond ONLY as JSON: {"signal":"...","score":8,"scoreReason":"..."}`

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
