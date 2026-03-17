import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel Serverless Function — Proxy para ERPNext2 (erp2.mistralsteel.com.br)
 *
 * Resolve CORS: o frontend chama /api/erp2/... (same-origin),
 * esta function faz o proxy para o ERPNext2 injetando o token de autenticação.
 *
 * Variáveis de ambiente (NÃO prefixadas com VITE_):
 *   ERP2_URL        — https://erp2.mistralsteel.com.br
 *   ERP2_API_KEY    — API Key do ERPNext2
 *   ERP2_API_SECRET — API Secret do ERPNext2
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const baseUrl = process.env.ERP2_URL || "https://erp2.mistralsteel.com.br";
  const apiKey = process.env.ERP2_API_KEY;
  const apiSecret = process.env.ERP2_API_SECRET;

  if (!apiKey || !apiSecret) {
    res.status(500).json({ error: "ERP2 credentials not configured" });
    return;
  }

  // Extrair o path após /api/erp2/
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
