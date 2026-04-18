/**
 * /api/relatorios-comercial.js
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

async function conn() {
  return mysql.createConnection({
    host: process.env.DO_MYSQL_HOST,
    port: parseInt(process.env.DO_MYSQL_PORT || '3306'),
    user: process.env.DO_MYSQL_USER,
    password: process.env.DO_MYSQL_PASSWORD,
    database: process.env.DO_MYSQL_DATABASE || 'comercial_aramesul',
    connectTimeout: 10000, ssl: {rejectUnauthorized: true},
  })
}

export default async function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  

  const db = await conn()
  try {
    // handler continuo

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

    return res.status(400).json({ error: 'tipo inválido' })
  } catch (err) {
    console.error('[Relatórios Comercial]', err.message)
    return res.status(500).json({ error: 'Erro interno', detalhe: err.message })
  } finally {
    await db.end()
  }
}
