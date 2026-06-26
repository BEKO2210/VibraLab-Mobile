/**
 * Ambient premium background: layered aurora blobs + a faint technical grid.
 * Purely decorative, sits behind everything, and is GPU-cheap (CSS transforms).
 */
export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Aurora glows */}
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-cyan/20 blur-3xl animate-aurora" />
      <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-accent/15 blur-3xl animate-aurora-slow" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-accent2/10 blur-3xl animate-aurora" />

      {/* Technical grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black, transparent 75%)',
        }}
      />
      {/* Vignette to keep data readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/80" />
    </div>
  )
}
