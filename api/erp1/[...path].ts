import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel Serverless Function — Proxy para ERPNext1 (erp.mistralsteel.com.br)
 *
 * Resolve CORS: o frontend chama /api/erp1/... (same-origin),
 * esta function faz o proxy para o ERPNext1 injetando o token de autenticação.
 *
 * Variáveis de ambiente (NÃO prefixadas com VITE_):
 *   ERP1_URL        — https://erp.mistralsteel.com.br
 *   ERP1_API_KEY    — API Key do ERPNext1
 *   ERP1_API_SECRET — API Secret do ERPNext1
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const baseUrl = process.env.ERP1_URL || "https://erp.mistralsteel.com.br";
  const apiKey = process.env.ERP1_API_KEY;
  const apiSecret = process.env.ERP1_API_SECRET;

  if (!apiKey || !apiSecret) {
    res.status(500).json({ error: "ERP1 credentials not configured" });
    return;
  }

  // Extrair o path após /api/erp1/
  const { path } = req.query;
  const subPath = Array.isArray(path) ? path.join("/") : path || "";
  const targetUrl = `${baseUrl}/api/${subPath}`;

  // Reconstruir query string (excluindo o path param do Vercel)
  const url = new URL(targetUrl);
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== "path" && typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method || "GET",
      headers: {
        Authorization: `token ${apiKey}:${apiSecret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    // Incluir body para POST/PUT/PATCH
    if (req.method && ["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.json();

    // Propagar status code do ERPNext
    res.status(response.status).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    res.status(502).json({ error: "Proxy error", details: message });
  }
}
