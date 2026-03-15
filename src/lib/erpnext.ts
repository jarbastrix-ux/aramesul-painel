/**
 * ERPNext API Client
 *
 * Cliente base para comunicação com a API REST do ERPNext.
 * Utiliza autenticação por token (API Key + API Secret).
 *
 * Variáveis de ambiente (Vite):
 *   VITE_ERPNEXT_URL   - URL base do ERPNext (ex: https://erp2.mistralsteel.com.br)
 *   VITE_API_KEY        - API Key gerada no ERPNext
 *   VITE_API_SECRET     - API Secret correspondente
 */

const ERPNEXT_URL = import.meta.env.VITE_ERPNEXT_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;
const API_SECRET = import.meta.env.VITE_API_SECRET as string;

if (!ERPNEXT_URL || !API_KEY || !API_SECRET) {
  console.warn(
    "[erpnext] Variáveis de ambiente VITE_ERPNEXT_URL, VITE_API_KEY ou VITE_API_SECRET não configuradas."
  );
}

/** Cabeçalhos padrão para todas as requisições */
const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

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
// Funções auxiliares
// ---------------------------------------------------------------------------

/**
 * Wrapper genérico para fetch com tratamento de erro padronizado.
 */
async function erpFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${ERPNEXT_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      ...defaultHeaders,
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

// ---------------------------------------------------------------------------
// API Pública
// ---------------------------------------------------------------------------

/**
 * Retorna uma lista de documentos de um DocType.
 *
 * @example
 * ```ts
 * const customers = await getList({
 *   doctype: "Customer",
 *   fields: ["name", "customer_name", "tax_id"],
 *   filters: [["customer_type", "=", "Company"]],
 *   orderBy: "creation desc",
 *   limitPageLength: 20,
 * });
 * ```
 */
export async function getList<T = Record<string, unknown>>(
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

/**
 * Retorna um documento específico pelo nome.
 *
 * @example
 * ```ts
 * const customer = await getDoc({
 *   doctype: "Customer",
 *   name: "GV DO BRASIL INDUSTRIA E COMERCIO DE ACO LTDA",
 * });
 * ```
 */
export async function getDoc<T = Record<string, unknown>>(
  options: GetDocOptions
): Promise<T> {
  const { doctype, name } = options;

  const result = await erpFetch<{ data: T }>(
    `/api/resource/${doctype}/${encodeURIComponent(name)}`
  );

  return result.data;
}

/**
 * Cria um novo documento no ERPNext.
 *
 * @example
 * ```ts
 * const newItem = await createDoc({
 *   doctype: "Item",
 *   data: { item_code: "TEST-001", item_name: "Teste", item_group: "Products" },
 * });
 * ```
 */
export async function createDoc<T = Record<string, unknown>>(
  options: CreateDocOptions
): Promise<T> {
  const { doctype, data } = options;

  const result = await erpFetch<{ data: T }>(
    `/api/resource/${doctype}`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

/**
 * Atualiza um documento existente no ERPNext.
 *
 * @example
 * ```ts
 * await updateDoc({
 *   doctype: "Customer",
 *   name: "CUST-00001",
 *   data: { customer_name: "Novo Nome" },
 * });
 * ```
 */
export async function updateDoc<T = Record<string, unknown>>(
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

/**
 * Exclui um documento do ERPNext.
 *
 * @example
 * ```ts
 * await deleteDoc({ doctype: "Item", name: "TEST-001" });
 * ```
 */
export async function deleteDoc(options: DeleteDocOptions): Promise<void> {
  const { doctype, name } = options;

  await erpFetch(
    `/api/resource/${doctype}/${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
}

/**
 * Executa uma chamada RPC (Remote Procedure Call) genérica.
 *
 * @example
 * ```ts
 * const result = await call({
 *   method: "frappe.client.get_count",
 *   args: { doctype: "Customer" },
 * });
 * ```
 */
export async function call<T = unknown>(options: CallOptions): Promise<T> {
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

/**
 * Retorna a contagem total de documentos de um DocType.
 *
 * @example
 * ```ts
 * const total = await getCount("Customer", [["disabled", "=", 0]]);
 * ```
 */
export async function getCount(
  doctype: string,
  filters: ERPFilter[] = []
): Promise<number> {
  const result = await call<number>({
    method: "frappe.client.get_count",
    args: { doctype, filters },
  });

  return result;
}

// ---------------------------------------------------------------------------
// Export default como namespace
// ---------------------------------------------------------------------------

const erpnext = {
  getList,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
  call,
  getCount,
};

export default erpnext;
