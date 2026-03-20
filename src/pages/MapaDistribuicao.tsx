export default function MapaDistribuicao() {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999
    }}>
      <iframe
        src="https://mistralsteel.com.br/mapa_distribuicao.html"
        style={{width:'100%', height:'100%', border:'none'}}
        title="Mapa de Distribuição"
      />
    </div>
  )
}
