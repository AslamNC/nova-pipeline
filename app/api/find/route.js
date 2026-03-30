import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { query } = await req.json()

    const prompt = `You are a B2B sales researcher for Peoplebox.ai. Use web search to find 8-12 real companies matching: "${query}".

These should be good prospects for Nova (AI interviewer for high-volume, high-turnover hiring).

For each company return: company name, industry, volume (specific e.g. "2,000+ hires/mo"), location, signal (2 sentences of hiring pain/news), score (1-10 fit for Nova), scoreReason (1 sentence).

Your ENTIRE response must be ONLY a valid JSON array, no markdown, no backticks:
[{"company":"...","industry":"...","volume":"...","location":"...","signal":"...","score":8,"scoreReason":"..."}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    const allText = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    const start = allText.indexOf('[')
    const end = allText.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No results found')

    let parsed
    try {
      parsed = JSON.parse(allText.slice(start, end + 1))
    } catch {
      const cleaned = allText.slice(start, end + 1)
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      parsed = JSON.parse(cleaned)
    }

    return Response.json(parsed.filter(l => l && l.company))
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
