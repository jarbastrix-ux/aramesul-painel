/**
 * ERPNext API Client
 *
 * Clientes para comunicação com a API REST do ERPNext via Vercel Proxy.
 * As credenciais ficam apenas no servidor (Vercel Functions), nunca no browser.
 *
 * ERPNext2 — dados operacionais (OEE, Frota, Work Orders)
 *   Proxy: /api/erp2/...  →  erp2.mistralsteel.com.br/api/...
 *
 * ERPNext1 — dados financeiros de produção
 *   Proxy: /api/erp1/...  →  erp.mistralsteel.com.br/api/...
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Filtro no formato do ERPNext: [field, operator, value] */
export type ERPFilter = [string, string, string | number | boolean | null];

/** Opções para getList */
export interface GetListOptions {
  doctype: string;
  fields?: string[];
  filters?: ERPFilter[];
  orderBy?: string;
  limitPageLength?: number;
  limitStart?: number;
}

/** Opções para getDoc */
export interface GetDocOptions {
  doctype: string;
  name: string;
}

/** Opções para createDoc */
export interface CreateDocOptions {
  doctype: string;
  data: Record<string, unknown>;
}

/** Opções para updateDoc */
export interface UpdateDocOptions {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
}

/** Opções para deleteDoc */
export interface DeleteDocOptions {
  doctype: string;
  name: string;
}

/** Opções para chamadas RPC genéricas */
export interface CallOptions {
  method: string;
  args?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Factory de cliente ERPNext (via proxy)
// ---------------------------------------------------------------------------

/**
 * Cria um cliente ERPNext que faz chamadas via proxy Vercel.
 * O proxy injeta as credenciais server-side, então o frontend
 * não precisa de tokens — apenas envia requests same-origin.
 *
 * @param proxyBase - Prefixo do proxy (ex: "/api/erp1" ou "/api/erp2")
 */
function createERPClient(proxyBase: string) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  async function erpFetch<T = unknown>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    // O path já vem com /api/resource/... ou /api/method/...
    // Precisamos mapear para /api/erp1/resource/... ou /api/erp2/resource/...
    // Removendo o prefixo /api do path, pois o proxyBase já tem /api/erp1
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    const url = `${proxyBase}${cleanPath}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `[erpnext] ${response.status} ${response.statusText} — ${errorBody}`
      );
    }

    const json = await response.json();
    return json as T;
  }

  async function getList<T = Record<string, unknown>>(
    options: GetListOptions
  ): Promise<T[]> {
    const {
      doctype,
      fields = ["name"],
      filters = [],
      orderBy = "creation desc",
      limitPageLength = 20,
      limitStart = 0,
    } = options;

    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      order_by: orderBy,
      limit_page_length: String(limitPageLength),
      limit_start: String(limitStart),
    });

    const result = await erpFetch<{ data: T[] }>(
      `/api/resource/${doctype}?${params.toString()}`
    );

    return result.data;
  }

  async function getDoc<T = Record<string, unknown>>(
    options: GetDocOptions
  ): Promise<T> {
    const { doctype, name } = options;

    const result = await erpFetch<{ data: T }>(
      `/api/resource/${doctype}/${encodeURIComponent(name)}`
    );

    return result.data;
  }

  async function createDoc<T = Record<string, unknown>>(
    options: CreateDocOptions
  ): Promise<T> {
    const { doctype, data } = options;

    const result = await erpFetch<{ data: T }>(`/api/resource/${doctype}`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    return result.data;
  }

  async function updateDoc<T = Record<string, unknown>>(
    options: UpdateDocOptions
  ): Promise<T> {
    const { doctype, name, data } = options;

    const result = await erpFetch<{ data: T }>(
      `/api/resource/${doctype}/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );

    return result.data;
  }

  async function deleteDoc(options: DeleteDocOptions): Promise<void> {
    const { doctype, name } = options;

    await erpFetch(
      `/api/resource/${doctype}/${encodeURIComponent(name)}`,
      { method: "DELETE" }
    );
  }

  async function call<T = unknown>(options: CallOptions): Promise<T> {
    const { method, args = {} } = options;

    const result = await erpFetch<{ message: T }>(
      `/api/method/${method}`,
      {
        method: "POST",
        body: JSON.stringify(args),
      }
    );

    return result.message;
  }

  async function getCount(
    doctype: string,
    filters: ERPFilter[] = []
  ): Promise<number> {
    const result = await call<number>({
      method: "frappe.client.get_count",
      args: { doctype, filters },
    });

    return result;
  }

  return {
    getList,
    getDoc,
    createDoc,
    updateDoc,
    deleteDoc,
    call,
    getCount,
  };
}

// ---------------------------------------------------------------------------
// Instâncias dos clientes (via proxy Vercel)
// ---------------------------------------------------------------------------

/** Cliente ERPNext2 — dados operacionais (OEE, Frota, Work Orders) */
const erpnext = createERPClient("/api/erp2");

/** Cliente ERPNext1 — dados financeiros de produção */
export const erpnext1 = createERPClient("/api/erp1");

// ---------------------------------------------------------------------------
// Exports compatíveis com código existente (ERPNext2 como padrão)
// ---------------------------------------------------------------------------

export const getList = erpnext.getList;
export const getDoc = erpnext.getDoc;
export const createDoc = erpnext.createDoc;
export const updateDoc = erpnext.updateDoc;
export const deleteDoc = erpnext.deleteDoc;
export const call = erpnext.call;
export const getCount = erpnext.getCount;

export default erpnext;
