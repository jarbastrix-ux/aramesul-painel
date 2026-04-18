/**
 * /api/comercial.js
 * GET ?tipo=jornadas  → lista jornadas
 * GET ?tipo=visitas   → lista visitas
 * GET ?tipo=despesas  → lista despesas
 */
import mysql from 'mysql2/promise'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * Extrai credenciais da URL do banco via regex para evitar problemas
 * de URL-encoding no parser nativo do mysql2.
 * Formato esperado: mysql://USER:PASSWORD@HOST:PORT/DATABASE
 */
function parseDbUrl(url) {
  const m = (url || '').match(
    /^mysql:\/\/([^:]+):(.+)@([^:]+):(\d+)\/([^?]+)/
  )
  if (!m) throw new Error('URL_DO_BANCO_DE_DADOS invalida ou ausente')
  return {
    user:     m[1],
    password: m[2],
    host:     m[3],
    port:     parseInt(m[4], 10),
    database: m[5],
  }
}

export default async function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { tipo } = req.query

  const creds = parseDbUrl(process.env.URL_DO_BANCO_DE_DADOS)
  const db = await mysql.createConnection({
    ...creds,
    ssl: { rejectUnauthorized: false },
  })

  try {
    if (tipo === 'jornadas') {
      await db.execute(`CREATE TABLE IF NOT EXISTS jornadas_comercial (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendedor_codigo VARCHAR(20) NOT NULL,
        vendedor_nome VARCHAR(120) NOT NULL,
        veiculo_placa VARCHAR(10) NOT NULL,
        km_inicial INT NOT NULL,
        km_final INT,
        km_rodados INT,
        foto_hodometro_inicial LONGTEXT,
        foto_hodometro_final LONGTEXT,
        status ENUM('ativa','finalizada') DEFAULT 'ativa',
        iniciada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finalizada_em TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

      const [rows] = await db.execute(
        'SELECT id, vendedor_codigo, vendedor_nome, veiculo_placa, km_inicial, km_final, km_rodados, status, iniciada_em, finalizada_em FROM jornadas_comercial ORDER BY iniciada_em DESC LIMIT 100'
      )
      return res.json({ ok: true, dados: rows })
    }

    if (tipo === 'visitas') {
      await db.execute(`CREATE TABLE IF NOT EXISTS visitas_comercial (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jornada_id INT,
        vendedor_codigo VARCHAR(20) NOT NULL,
        vendedor_nome VARCHAR(120),
        cnpj VARCHAR(14) NOT NULL,
        nome_fantasia VARCHAR(200) NOT NULL,
        observacao TEXT,
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        visitada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

      const [rows] = await db.execute(
        'SELECT id, vendedor_codigo, vendedor_nome, cnpj, nome_fantasia, latitude, longitude, visitada_em FROM visitas_comercial ORDER BY visitada_em DESC LIMIT 100'
      )
      return res.json({ ok: true, dados: rows })
    }

    if (tipo === 'despesas') {
      await db.execute(`CREATE TABLE IF NOT EXISTS despesas_comercial (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jornada_id INT,
        vendedor_codigo VARCHAR(20) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        descricao VARCHAR(255),
        foto_recibo LONGTEXT,
        nfce_url TEXT,
        registrada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

      const [rows] = await db.execute(
        'SELECT id, vendedor_codigo, tipo, valor, descricao, registrada_em FROM despesas_comercial ORDER BY registrada_em DESC LIMIT 100'
      )
      return res.json({ ok: true, dados: rows })
    }

    return res.status(400).json({ error: 'tipo invalido' })
  } catch (err) {
    console.error('[Comercial]', err.message)
    return res.status(500).json({ error: 'Erro interno', detalhe: err.message })
  } finally {
    await db.end()
  }
}
