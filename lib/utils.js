export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function scoreClass(s) {
  if (s >= 7) return 'score-high'
  if (s >= 4) return 'score-mid'
  return 'score-low'
}

export function statusLabel(s) {
  return { new: 'NEW', researched: 'RESEARCHED', ready: 'EMAIL READY', sent: 'SENT', replied: 'REPLIED' }[s] || 'NEW'
}

export function statusColor(s) {
  return {
    new: 'bg-gray-100 text-gray-500',
    researched: 'bg-blue-100 text-blue-700',
    ready: 'bg-purple-100 text-purple-700',
    sent: 'bg-amber-100 text-amber-700',
    replied: 'bg-green-100 text-green-700',
  }[s] || 'bg-gray-100 text-gray-500'
}
