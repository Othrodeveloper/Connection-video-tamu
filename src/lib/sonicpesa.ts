export const SONICPESA_BASE_URL = "https://api.sonicpesa.com/api/v1";

export interface SonicPesaConfig {
  api_key: string;
  api_secret: string;
  base_url: string;
  enabled: boolean;
}

const HTTP_ERRORS: Record<number, string> = {
  400: "Taarifa za malipo si sahihi. Angalia namba ya simu kisha ujaribu tena.",
  401: "SonicPesa imekataa API key au API secret. Admin aangalie funguo kwenye Unganisha Malipo.",
  403: "SonicPesa imekataa ruhusa ya malipo. Admin ahakikisha akaunti yake imeidhinishwa.",
  404: "Oda ya malipo haikupatikana.",
  408: "SonicPesa imechelewa kujibu. Jaribu tena.",
  409: "Oda hii tayari inashughulikiwa. Subiri uthibitisho.",
  422: "Taarifa za malipo hazijakubaliwa. Angalia namba na kiasi.",
  429: "Maombi ni mengi kwa sasa. Subiri kidogo kisha ujaribu tena.",
  500: "SonicPesa ina hitilafu kwa sasa. Jaribu tena baada ya muda mfupi.",
  502: "SonicPesa haipatikani kwa sasa. Jaribu tena baada ya muda mfupi.",
  503: "SonicPesa haipatikani kwa sasa. Jaribu tena baada ya muda mfupi.",
};

/** Build the provider request without ever placing either credential in the browser bundle. */
export function sonicPesaRequest(
  cfg: SonicPesaConfig,
  path: "/payment/create_order" | "/payment/order_status",
  body: unknown,
) {
  return {
    url: `${(cfg.base_url || SONICPESA_BASE_URL).replace(/\/+$/, "")}${path}`,
    init: {
      method: "POST",
      headers: {
        "X-API-KEY": cfg.api_key,
        "X-API-SECRET": cfg.api_secret,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    } satisfies RequestInit,
  };
}

function responseData(json: Record<string, unknown>) {
  return (json["data"] ?? {}) as Record<string, unknown>;
}

export function sonicOrderId(json: Record<string, unknown>) {
  const data = responseData(json);
  const nested = (data["order_status_data"] ?? {}) as Record<string, unknown>;
  const value = data["order_id"] ?? nested["order_id"] ?? json["order_id"];
  return typeof value === "string" && value.trim() ? value : null;
}

export function sonicPaymentStatus(json: Record<string, unknown>) {
  const data = responseData(json);
  const value = data["payment_status"] ?? data["status"] ?? json["payment_status"] ?? "PENDING";
  return String(value).toUpperCase();
}

export function sonicAuthRejected(status: number, json: Record<string, unknown>) {
  if (status === 401 || status === 403) return true;
  const raw = `${String(json["message"] ?? "")} ${String(json["error"] ?? "")}`.toLowerCase();
  return /invalid.*(api|key|secret)|unauthori[sz]ed|authentication|permission|forbidden/.test(raw);
}

/** Return a safe, useful message without relaying raw provider responses or request data. */
export function sonicErrorMessage(status: number, json: Record<string, unknown>) {
  const raw = `${String(json["message"] ?? "")} ${String(json["error"] ?? "")}`.toLowerCase();
  if (/invalid.*(api|key|secret)|unauthori[sz]ed|authentication/.test(raw))
    return HTTP_ERRORS[401]!;
  if (/permission|forbidden|merchant.*(disabled|inactive)|account.*(disabled|inactive)/.test(raw))
    return HTTP_ERRORS[403]!;
  if (/balance|float|insufficient funds/.test(raw))
    return "Akaunti ya SonicPesa haina salio la kutosha kutuma malipo. Admin aongee na SonicPesa.";
  if (/phone|msisdn|mobile/.test(raw))
    return "SonicPesa imekataa namba ya simu. Angalia namba kisha ujaribu tena.";
  if (/amount|currency/.test(raw))
    return "SonicPesa imekataa kiasi cha malipo. Admin aangalie bei ya kifurushi.";
  if (/timeout|timed out/.test(raw)) return HTTP_ERRORS[408]!;
  return (
    HTTP_ERRORS[status] ??
    "SonicPesa imeshindikana kukubali ombi. Jaribu tena au wasiliana na admin."
  );
}
