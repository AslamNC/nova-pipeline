import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { query } = await req.json()

    const prompt = `You are a B2B sales researcher for Peoplebox.ai. Search the web to find 8-10 real companies matching: "${query}"

For each company, find the COO, VP Operations, VP Talent Acquisition, or Chief People Officer — the ops-level decision maker, NOT the HR head.

For each contact return:
- company: company name
- industry: industry/sector
- contact: full name of the ops-level person
- title: their exact title
- email: best-guess email (use common patterns like firstname.lastname@domain.com or firstname@domain.com based on company domain)
- linkedin: LinkedIn profile URL if findable
- signal: 2 sentences about their specific operational hiring pain that makes Nova relevant
- score: fit score 1-10 for Nova
- confidence: email confidence — high/medium/low

Your ENTIRE response must be ONLY a valid JSON array, no markdown, no backticks:
[{"company":"...","industry":"...","contact":"...","title":"...","email":"...","linkedin":"...","signal":"...","score":8,"confidence":"medium"}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
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
        .replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      parsed = JSON.parse(cleaned)
    }

    return Response.json(parsed.filter(l => l && l.company && l.contact))
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
