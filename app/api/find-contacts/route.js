import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { query, company, contact } = await req.json()

    // Single contact email lookup mode
    if (company && contact) {
      const emailPrompt = `Search the web to find the work email address and LinkedIn profile for:
Name: ${contact}
Company: ${company}

Search for their LinkedIn profile, company website, press releases, conference speaker bios, or any public source.

Respond ONLY as JSON (no markdown):
{"email":"...","email_confidence":"high|medium|low","linkedin":"...","title":"..."}`

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: emailPrompt }],
      })

      const allText = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      const s = allText.indexOf('{'), e = allText.lastIndexOf('}')
      if (s === -1 || e === -1) return Response.json({ email: '', email_confidence: 'low', linkedin: '', title: '' })
      const parsed = JSON.parse(allText.slice(s, e + 1))
      return Response.json(parsed)
    }

    // Bulk contact finder mode
    const prompt = `You are a B2B sales researcher. Search the web to find 8-10 real companies matching: "${query}"

For each company, find the COO, VP Operations, or Chief People Officer — the ops-level decision maker, NOT the HR head.

Search company websites, LinkedIn, press releases, and news to find real named contacts.

For each return:
- company: real company name
- industry: sector
- contact: full name (must be a real person, not a placeholder)
- title: their exact title
- email: best-guess work email using common patterns (firstname.lastname@domain.com)
- linkedin: LinkedIn URL if found
- signal: 2 sentences on their specific operational hiring pain
- score: Nova fit score 1-10
- confidence: email confidence high/medium/low

Respond ONLY as a JSON array, no markdown, no backticks:
[{"company":"...","industry":"...","contact":"...","title":"...","email":"...","linkedin":"...","signal":"...","score":8,"confidence":"medium"}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    const allText = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n')

    // Try to find JSON array
    const start = allText.indexOf('[')
    const end = allText.lastIndexOf(']')

    if (start === -1 || end === -1) {
      // Fallback: ask again without web search for structured output
      const fallback = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Based on your knowledge, list 8 real companies that match "${query}" with their ops/COO-level contacts. Return ONLY a JSON array:\n[{"company":"...","industry":"...","contact":"...","title":"...","email":"...","linkedin":"","signal":"...","score":7,"confidence":"low"}]`
        }],
      })
      const ft = fallback.content[0]?.text || ''
      const fs = ft.indexOf('['), fe = ft.lastIndexOf(']')
      if (fs === -1 || fe === -1) throw new Error('Could not find contacts for this query')
      const fp = JSON.parse(ft.slice(fs, fe + 1))
      return Response.json(fp.filter(l => l && l.company && l.contact))
    }

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
