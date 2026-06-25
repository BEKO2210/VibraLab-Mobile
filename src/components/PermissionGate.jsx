/**
 * Renders permission / availability state for a sensor and a button to grant
 * access. When status is 'running' it renders its children (the live UI).
 */
export default function PermissionGate({ status, onRequest, label, children }) {
  if (status === 'running') return children

  const messages = {
    idle: {
      title: `${label} aktivieren`,
      body: 'Zugriff erforderlich. Tippe, um die Erlaubnis zu erteilen.',
      action: 'Zugriff erlauben',
      tone: 'accent',
    },
    requesting: {
      title: 'Warte auf Erlaubnis…',
      body: 'Bestätige die Browser-Abfrage.',
      action: null,
      tone: 'muted',
    },
    denied: {
      title: 'Zugriff verweigert',
      body: 'Die Erlaubnis wurde abgelehnt. Erlaube den Zugriff in den Seiten-Einstellungen des Browsers und versuche es erneut.',
      action: 'Erneut versuchen',
      tone: 'warn',
    },
    unsupported: {
      title: 'Sensor nicht verfügbar',
      body: `${label} wird auf diesem Gerät/Browser nicht bereitgestellt. Hinweis: Akzelerometer und Mikrofon brauchen HTTPS — öffne die App über die bereitgestellte HTTPS-URL (z.B. Vercel), nicht über http.`,
      action: 'Nochmal prüfen',
      tone: 'warn',
    },
  }

  const m = messages[status] || messages.idle
  const toneClass =
    m.tone === 'warn' ? 'border-warn/50 text-warn' : m.tone === 'muted' ? 'border-edge text-gray-400' : 'border-accent/50 text-accent'

  return (
    <div className={`rounded-2xl bg-panel border ${toneClass} p-6 text-center space-y-3`}>
      <div className="text-lg font-semibold">{m.title}</div>
      <p className="text-sm text-gray-400 leading-relaxed">{m.body}</p>
      {m.action && (
        <button
          onClick={onRequest}
          className="mt-2 rounded-xl bg-accent text-ink px-5 py-3 font-semibold active:scale-[0.99] transition-transform"
        >
          {m.action}
        </button>
      )}
    </div>
  )
}
