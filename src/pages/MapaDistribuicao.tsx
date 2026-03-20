import { useEffect } from 'react'

export default function MapaDistribuicao() {
  useEffect(() => {
    window.open('https://mistralsteel.com.br/mapa_distribuicao.html', '_blank')
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '80vh',
      gap: '16px'
    }}>
      <p style={{color: 'var(--color-text-secondary)', fontSize: '14px'}}>
        O mapa abre em nova aba automaticamente.
      </p>
      <a
        href="https://mistralsteel.com.br/mapa_distribuicao.html"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: '#C85A1A',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '14px'
        }}
      >
        🗺️ Abrir Mapa de Distribuição
      </a>
    </div>
  )
}
