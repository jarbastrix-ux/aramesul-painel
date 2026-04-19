/**
 * /api/comercial.js
 *
 * GET  ?tipo=veiculos   → lista os 8 veículos da frota comercial (hardcoded)
 * GET  ?tipo=vendedores → lista vendedores do banco TiDB
 * POST ?tipo=vendedores → cadastra vendedor { nome, email?, telefone? }
 * DELETE ?tipo=vendedores&id=X → remove vendedor por id
 *
 * Usa @tidbcloud/serverless (HTTP-based, sem problemas de SSL/TCP).
 */
import { connect } from '@tidbcloud/serverless'

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

async function getDb() {
  const db = connect({ url: process.env.URL_DO_BANCO_DE_DADOS })
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vendedores_comercial (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      nome      VARCHAR(255) NOT NULL,
      email     VARCHAR(320),
      telefone  VARCHAR(30),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  return db
}

export default async function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { tipo, id } = req.query

  try {
    if (req.method === 'GET') {
      if (tipo === 'veiculos') {
        return res.json({ ok: true, dados: VEICULOS })
      }
      if (tipo === 'vendedores') {
        const db = await getDb()
        const rows = await db.execute(
          'SELECT id, nome, email, telefone, criado_em FROM vendedores_comercial ORDER BY nome'
        )
        return res.json({ ok: true, dados: rows.rows ?? rows })
      }
      return res.status(400).json({ error: 'tipo invalido. Use: veiculos | vendedores' })
    }

    if (req.method === 'POST' && tipo === 'vendedores') {
      const { nome, email = null, telefone = null } = req.body ?? {}
      if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' })
      const db = await getDb()
      const result = await db.execute(
        'INSERT INTO vendedores_comercial (nome, email, telefone) VALUES (?, ?, ?)',
        [nome, email, telefone]
      )
      return res.json({ ok: true, id: result.lastInsertId })
    }

    if (req.method === 'DELETE' && tipo === 'vendedores') {
      if (!id) return res.status(400).json({ error: 'id e obrigatorio' })
      const db = await getDb()
      await db.execute('DELETE FROM vendedores_comercial WHERE id = ?', [id])
      return res.json({ ok: true })
    }

    return res.status(405).json({ error: 'metodo nao permitido' })
  } catch (err) {
    console.error('[api/comercial] erro:', err)
    return res.status(500).json({ error: err.message })
  }
}
