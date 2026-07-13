'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        background: '#0a6135', color: '#fff', border: 0, borderRadius: 10,
        padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
      }}
    >
      Printen / opslaan als PDF
    </button>
  )
}
