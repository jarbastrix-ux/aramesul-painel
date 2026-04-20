/**
 * /api/comercial.js
 *
 * GET  ?tipo=veiculos   → lista os 8 veículos da frota comercial (hardcoded)
 * GET  ?tipo=vendedores → lista vendedores do banco TiDB (WHERE ativo = 1)
 * POST ?tipo=vendedores OU body:{tipo:"vendedor",...} → cadastra vendedor { nome_completo|nome, email?, telefone? }
 * DELETE body:{id,tipo} → desativa vendedor (soft delete: ativo=0)
 *
 * Usa @tidbcloud/serverless (HTTP-based, sem problemas de SSL/TCP).
 *
 * NOTA: Em funções Vercel serverless (Vite, não Next.js), req.body só é
 * populado automaticamente para POST. Para DELETE, o body chega como stream
 * bruto. O helper parseBody() lê o stream e parseia o JSON manualmente.
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

/**
 * Lê o body da requisição como stream e parseia como JSON.
 * Necessário para métodos DELETE em funções Vercel serverless (não-Next.js),
 * onde req.body não é populado automaticamente.
 * Retorna {} se o body estiver vazio ou não for JSON válido.
 */
function parseBody(req) {
  // Se o Vercel já populou req.body (ex: POST), usa diretamente
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body)
    try { return Promise.resolve(JSON.parse(req.body)) } catch { return Promise.resolve({}) }
  }
  // Caso contrário, lê o stream manualmente
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk.toString() })
    req.on('end', () => {
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

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

  const { tipo } = req.query

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (tipo === 'veiculos') {
        return res.json({ ok: true, dados: VEICULOS })
      }
      if (tipo === 'vendedores') {
        const db = await getDb()
        const rows = await db.execute(
          'SELECT id, nome, email, telefone, criado_em FROM vendedores_comercial WHERE ativo = 1 ORDER BY nome'
        )
        return res.json({ ok: true, dados: rows.rows ?? rows })
      }
      return res.status(400).json({ error: 'tipo invalido. Use: veiculos | vendedores' })
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await parseBody(req)
      // aceita tipo da query string (?tipo=vendedores) OU do body JSON ({tipo:"vendedor"})
      const postTipo = tipo ?? body.tipo ?? null
      if (postTipo !== 'vendedor' && postTipo !== 'vendedores') {
        return res.status(400).json({ error: 'tipo invalido para POST. Use: vendedor | vendedores' })
      }
      // aceita nome_completo (frontend) ou nome (retrocompatível)
      const nome = body.nome_completo ?? body.nome ?? null
      const email = body.email ?? null
      const telefone = body.telefone ?? null
      if (!nome) return res.status(400).json({ error: 'nome (ou nome_completo) e obrigatorio' })
      const db = await getDb()
      const result = await db.execute(
        'INSERT INTO vendedores_comercial (nome, email, telefone) VALUES (?, ?, ?)',
        [nome, email, telefone]
      )
      return res.json({ ok: true, id: result.lastInsertId })
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      // Aceita id e tipo tanto da query string quanto do body JSON.
      // Vercel+Vite não popula req.body em DELETE, mas clientes REST padrão
      // (mobile app, scripts externos) podem mandar no body.
      let bodyParsed = {}
      if (req.body && typeof req.body === 'object') {
        bodyParsed = req.body
      } else if (typeof req.body === 'string' && req.body.length > 0) {
        try { bodyParsed = JSON.parse(req.body) } catch { bodyParsed = {} }
      }
      const deleteId = req.query.id ?? bodyParsed.id ?? null
      const deleteTipo = req.query.tipo ?? bodyParsed.tipo ?? null
      // aceita 'vendedor' (frontend) ou 'vendedores' (retrocompatível)
      if (deleteTipo !== 'vendedor' && deleteTipo !== 'vendedores') {
        return res.status(400).json({ error: 'tipo invalido para DELETE. Use: vendedor | vendedores' })
      }
      if (!deleteId) return res.status(400).json({ error: 'id e obrigatorio' })
      const db = await getDb()
      const result = await db.execute(
        'UPDATE vendedores_comercial SET ativo = 0, updated_at = NOW() WHERE id = ? AND ativo = 1',
        [deleteId]
      )
      const affected = result.rowsAffected ?? result.affectedRows ?? 0
      if (affected === 0) {
        return res.status(404).json({ ok: false, error: 'vendedor nao encontrado ou ja desativado' })
      }
      return res.json({ ok: true })
    }

    return res.status(405).json({ error: 'metodo nao permitido' })
  } catch (err) {
    console.error('[api/comercial] erro:', err)
    return res.status(500).json({ error: err.message })
  }
}


