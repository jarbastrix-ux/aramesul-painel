import mysql from 'mysql2/promise';

const db = await mysql.createConnection(process.env.URL_DO_BANCO_DE_DADOS);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const tipo = req.query.tipo;
      if (tipo === 'vendedores') {
        const [rows] = await db.execute('SELECT * FROM vendedores_comercial WHERE ativo=1 ORDER BY nome');
        return res.json({ dados: rows });
      }
      if (tipo === 'veiculos') {
        const [rows] = await db.execute('SELECT * FROM veiculos_comercial WHERE ativo=1 ORDER BY placa');
        return res.json({ dados: rows });
      }
      return res.status(400).json({ erro: 'tipo invalido' });
    }

    if (req.method === 'POST') {
      const { tipo, nome, email, telefone, placa, marca, modelo, ano } = req.body;
      if (tipo === 'vendedor') {
        const codigo = 'V' + Date.now().toString().slice(-6);
        await db.execute(
          'INSERT INTO vendedores_comercial (codigo, nome, email, telefone) VALUES (?,?,?,?)',
          [codigo, nome, email || null, telefone || null]
        );
        return res.json({ ok: true, codigo });
      }
      if (tipo === 'veiculo') {
        await db.execute(
          'INSERT IGNORE INTO veiculos_comercial (placa, modelo, marca, ano) VALUES (?,?,?,?)',
          [placa, modelo, marca, ano || null]
        );
        return res.json({ ok: true });
      }
      return res.status(400).json({ erro: 'tipo invalido' });
    }

    if (req.method === 'DELETE') {
      const { id, tipo } = req.body;
      if (tipo === 'vendedor') await db.execute('UPDATE vendedores_comercial SET ativo=0 WHERE id=?', [id]);
      if (tipo === 'veiculo') await db.execute('UPDATE veiculos_comercial SET ativo=0 WHERE id=?', [id]);
      return res.json({ ok: true });
    }

    return res.status(405).json({ erro: 'metodo nao permitido' });
  } catch (e) {
    return res.status(500).json({ erro: e.message });
  }
}
