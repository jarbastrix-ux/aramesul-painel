import { useEffect, useRef } from 'react'

export default function MapaDistribuicao() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Recarrega o iframe toda vez que a página é acessada
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }, [])

  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',zIndex:9999}}>
      <iframe
        ref={iframeRef}
        src="https://mistralsteel.com.br/mapa_distribuicao.html"
        style={{width:'100%',height:'100%',border:'none'}}
        title="Mapa de Distribuição"
      />
    </div>
  )
}
