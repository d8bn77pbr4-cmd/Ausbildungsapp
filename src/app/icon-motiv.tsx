/** Radar-Motiv für alle App-Icons (für ImageResponse; nur Flexbox und einfache CSS-Werte). */
export function IconMotiv({ groesse }: { groesse: number }) {
  const ring = (anteil: number, deckkraft: number) => ({
    position: 'absolute' as const,
    width: groesse * anteil,
    height: groesse * anteil,
    borderRadius: '50%',
    border: `${Math.max(2, groesse * 0.035)}px solid rgba(255,255,255,${deckkraft})`,
  });
  return (
    <div
      style={{
        width: groesse,
        height: groesse,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(160deg, #2b8cff 0%, #0058c2 100%)',
      }}
    >
      <div style={ring(0.72, 0.35)} />
      <div style={ring(0.48, 0.6)} />
      <div style={ring(0.24, 0.9)} />
      <div style={{ position: 'absolute', width: groesse * 0.08, height: groesse * 0.08, borderRadius: '50%', background: '#ffffff' }} />
    </div>
  );
}
