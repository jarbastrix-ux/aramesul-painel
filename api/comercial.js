/**
 * /api/comercial.js
 * GET ?tipo=veiculos   → lista os 8 veículos da frota comercial (hardcoded)
 * GET ?tipo=vendedores → retorna array vazio
 * POST / DELETE        → retorna {ok:true} sem efeito colateral
 *
 * Sem banco de dados, sem mysql2, sem conexão externa.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const VEICULOS = [
  { placa: 'BEA5B41', marca: 'Ford',       modelo: 'Ka Se Plus 1.0 Ha C', ano: 2020 },
  { placa: 'QUZ0E55', marca: 'Renault',    modelo: 'Kwid Zen 10mt',        ano: 2020 },
  { placa: 'BCH7F70', marca: 'Renault',    modelo: 'Kwid Zen 10mt',        ano: 2019 },
  { placa: 'SFJ2H98', marca: 'Byd',        modelo: 'Dolphin Mini',         ano: 2023 },
  { placa: 'BBG8871', marca: 'Chevrolet',  modelo: 'Montana Ls1',          ano: 2017 },
  { placa: 'BEB7J48', marca: 'Ford',       modelo: 'Ka Se 1.0 Ha C',       ano: 2020 },
  { placa: 'RHE4I02', marca: 'Volkswagen', modelo: 'Gol 1.0l Mc4',         ano: 2022 },
  { placa: 'BBG8869', marca: 'Chevrolet',  modelo: 'Montana Ls1',          ano: 2017 },
]

export default function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const { tipo } = req.query

    if (tipo === 'veiculos') {
      return res.json({ ok: true, dados: VEICULOS })
    }

    if (tipo === 'vendedores') {
      return res.json({ ok: true, dados: [] })
    }

    return res.status(400).json({ error: 'tipo invalido. Use: veiculos | vendedores' })
  }

  // POST e DELETE: retornam ok sem efeito colateral
  return res.json({ ok: true })
}
