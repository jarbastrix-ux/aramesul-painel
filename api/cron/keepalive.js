/**
 * /api/cron/keepalive.js
 *
 * Vercel Cron Job — executa diariamente para:
 * 1. Manter o cluster TiDB Cloud Serverless ativo (evita pausa por inatividade)
 * 2. Verificar os endpoints críticos do painel
 * 3. Enviar alerta Telegram se algum endpoint retornar 5xx
 *
 * Cron schedule: 0 8 * * * (todo dia às 08:00 UTC)
 */

import { connect } from '@tidbcloud/serverless';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// URL de produção hardcoded — o VERCEL_URL aponta para o preview, não para o domínio customizado
const PROD_URL = 'https://gestao.mistralsteel.com.br';

async function sendTelegram(msg) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: msg,
          parse_mode: 'HTML',
        }),
      }
    );
  } catch (_) {}
}

async function tidbKeepAlive() {
  const conn = connect({ url: process.env.URL_DO_BANCO_DE_DADOS });
  // @tidbcloud/serverless retorna array de rows
  const rows = await conn.execute('SELECT 1 AS ok');
  // rows é um array; rows[0] é o primeiro row como objeto
  return Array.isArray(rows) && rows.length > 0;
}

async function checkEndpoint(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return res.status;
  } catch (e) {
    return 0;
  }
}

export default async function handler(req, res) {
  // Vercel Cron Jobs enviam o header Authorization com CRON_SECRET
  const authHeader = req.headers['authorization'];
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {};
  const errors = [];

  // 1. Keep-alive TiDB — apenas executa SELECT 1 para manter o cluster ativo
  try {
    const ok = await tidbKeepAlive();
    results.tidb_keepalive = ok ? 'OK' : 'FALHOU';
    if (!ok) errors.push('TiDB SELECT 1 retornou resultado inesperado');
  } catch (e) {
    results.tidb_keepalive = 'ERRO';
    errors.push(`TiDB keep-alive falhou: ${e.message}`);
  }

  // 2. Verificar endpoints críticos (apenas 5xx são alertados — 401/403 são ignorados)
  const endpoints = [
    { name: 'relatorios/jornadas', path: '/api/relatorios-comercial?tipo=jornadas' },
    { name: 'relatorios/despesas', path: '/api/relatorios-comercial?tipo=despesas' },
    { name: 'relatorios/visitas',  path: '/api/relatorios-comercial?tipo=visitas' },
    { name: 'comercial/vendedores', path: '/api/comercial?tipo=vendedores' },
  ];

  for (const ep of endpoints) {
    const status = await checkEndpoint(`${PROD_URL}${ep.path}`);
    results[ep.name] = status;
    // Alerta apenas para 5xx ou timeout (0) — 401/403 são esperados sem autenticação
    if (status >= 500 || status === 0) {
      errors.push(`${ep.name} retornou ${status === 0 ? 'TIMEOUT' : status}`);
    }
  }

  // 3. Enviar alerta Telegram se houver erros críticos
  if (errors.length > 0) {
    const msg =
      `⚠️ <b>Alerta gestao.mistralsteel.com.br</b>\n\n` +
      `Problemas detectados pelo healthcheck diário:\n` +
      errors.map((e) => `• ${e}`).join('\n') +
      `\n\n<i>${new Date().toISOString()}</i>`;
    await sendTelegram(msg);
  }

  return res.status(200).json({
    ok: errors.length === 0,
    timestamp: new Date().toISOString(),
    results,
    errors,
  });
}
