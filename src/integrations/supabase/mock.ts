import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "./types";

const SESSION_KEY = "tv_mock_session";

interface StoredSessionMeta {
  userId: string;
  email: string;
  phone: string;
  full_name: string;
}

interface SerializedFilter {
  type: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "not" | "ilike" | "or";
  col?: string;
  val?: unknown;
  op?: string;
  expr?: string;
}

const g = globalThis as unknown as {
  __TRANDING_LOCAL_EXEC__?: (payload: unknown) => Promise<unknown>;
  __TRANDING_AUTH_LISTENERS__?: Set<(event: string, session: Session | null) => void>;
};

function getListeners() {
  if (!g.__TRANDING_AUTH_LISTENERS__) g.__TRANDING_AUTH_LISTENERS__ = new Set();
  return g.__TRANDING_AUTH_LISTENERS__;
}

async function execLocal<T = { data: unknown; error: null | { message: string }; count?: number }>(
  payload: unknown,
): Promise<T> {
  if (typeof g.__TRANDING_LOCAL_EXEC__ === "function") {
    return (await g.__TRANDING_LOCAL_EXEC__(payload)) as T;
  }
  if (typeof window !== "undefined") {
    const res = await fetch("/api/local-supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { data: null, error: { message: `Hitilafu ya seva (${res.status})` } } as T;
    }
    return (await res.json()) as T;
  }
  return { data: null, error: { message: "Huduma ya ndani haipatikani" } } as T;
}

function readStoredMeta(): StoredSessionMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSessionMeta>;
    if (typeof parsed.userId !== "string" || !parsed.userId) return null;
    return {
      userId: parsed.userId,
      email:
        typeof parsed.email === "string" ? parsed.email : `${parsed.userId}@simu.trandingvideo.app`,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      full_name: typeof parsed.full_name === "string" ? parsed.full_name : "Mtumiaji",
    };
  } catch {
    return null;
  }
}

function writeStoredSession(session: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (session?.user) {
      const meta: StoredSessionMeta = {
        userId: session.user.id,
        email: session.user.email ?? `${session.user.id}@simu.trandingvideo.app`,
        phone: session.user.phone ?? String(session.user.user_metadata?.["phone"] ?? ""),
        full_name: String(session.user.user_metadata?.["full_name"] ?? "Mtumiaji"),
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(meta));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
}

function emitAuth(event: string, session: Session | null) {
  for (const listener of getListeners()) {
    try {
      listener(event, session);
    } catch {
      /* ignore */
    }
  }
}

class MockQueryBuilder {
  private table: string;
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private selectExpr = "*";
  private countMode = false;
  private headMode = false;
  private payload: unknown = null;
  private filters: SerializedFilter[] = [];
  private orders: Array<{ col: string; ascending: boolean }> = [];
  private limitN: number | null = null;
  private singleMode: "none" | "single" | "maybeSingle" = "none";

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", opts?: { count?: string; head?: boolean }) {
    this.selectExpr = columns;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headMode = true;
    return this;
  }

  insert(rows: unknown) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }

  update(patch: unknown) {
    this.op = "update";
    this.payload = patch;
    return this;
  }

  upsert(rows: unknown) {
    this.op = "upsert";
    this.payload = rows;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ type: "eq", col, val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ type: "neq", col, val });
    return this;
  }

  gt(col: string, val: unknown) {
    this.filters.push({ type: "gt", col, val });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ type: "gte", col, val });
    return this;
  }

  lt(col: string, val: unknown) {
    this.filters.push({ type: "lt", col, val });
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push({ type: "lte", col, val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ type: "in", col, val: vals });
    return this;
  }

  is(col: string, val: unknown) {
    this.filters.push({ type: "is", col, val });
    return this;
  }

  not(col: string, op: string, val: unknown) {
    this.filters.push({ type: "not", col, op, val });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ type: "ilike", col, val: pattern });
    return this;
  }

  or(expr: string) {
    this.filters.push({ type: "or", expr });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  range(from: number, to: number) {
    this.limitN = Math.max(0, to - from + 1);
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: null | { message: string };
          count?: number;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return execLocal({
      kind: "query",
      table: this.table,
      op: this.op,
      selectExpr: this.selectExpr,
      countMode: this.countMode,
      headMode: this.headMode,
      payload: this.payload,
      filters: this.filters,
      orders: this.orders,
      limitN: this.limitN,
      singleMode: this.singleMode,
    }).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

class MockRpcBuilder {
  private fn: string;
  private args: Record<string, unknown>;
  private singleMode = false;

  constructor(fn: string, args: Record<string, unknown> = {}) {
    this.fn = fn;
    this.args = args;
  }

  maybeSingle() {
    this.singleMode = true;
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: null | { message: string };
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const meta = readStoredMeta();
    return execLocal({
      kind: "rpc",
      fn: this.fn,
      args: this.args,
      singleMode: this.singleMode,
      userId: meta?.userId ?? null,
    }).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

export function createMockSupabaseClient() {
  const auth = {
    async getSession() {
      const meta = readStoredMeta();
      if (!meta) return { data: { session: null }, error: null };
      const res = await execLocal<{ data: { user: User | null }; error: null }>({
        kind: "auth",
        action: "getUser",
        userId: meta.userId,
      });
      if (!res.data?.user) {
        writeStoredSession(null);
        return { data: { session: null }, error: null };
      }
      const session: Session = {
        access_token: `mock.${res.data.user.id}.token`,
        refresh_token: `mock.${res.data.user.id}.refresh`,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: res.data.user,
      };
      return { data: { session }, error: null };
    },
    async getUser() {
      const meta = readStoredMeta();
      if (!meta) return { data: { user: null }, error: null };
      return await execLocal<{ data: { user: User | null }; error: null }>({
        kind: "auth",
        action: "getUser",
        userId: meta.userId,
      });
    },
    async getClaims(token?: string) {
      const meta = readStoredMeta();
      return await execLocal<{
        data: { claims: { sub: string; email: string } } | null;
        error: null | { message: string };
      }>({
        kind: "auth",
        action: "getClaims",
        token,
        userId: meta?.userId ?? null,
      });
    },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      const listeners = getListeners();
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(callback);
            },
          },
        },
      };
    },
    async signUp(opts: {
      email: string;
      password: string;
      options?: { data?: { full_name?: string; phone?: string; referral_code?: string } };
    }) {
      const res = await execLocal<{
        data: { user: User | null; session: Session | null };
        error: null | { message: string };
      }>({
        kind: "auth",
        action: "signUp",
        email: opts.email,
        password: opts.password,
        options: opts.options,
      });
      if (!res.error && res.data?.session) {
        writeStoredSession(res.data.session);
        emitAuth("SIGNED_IN", res.data.session);
      }
      return res;
    },
    async signInWithPassword(opts: { email: string; password: string }) {
      const res = await execLocal<{
        data: { user: User | null; session: Session | null };
        error: null | { message: string };
      }>({
        kind: "auth",
        action: "signInWithPassword",
        email: opts.email,
        password: opts.password,
      });
      if (!res.error && res.data?.session) {
        writeStoredSession(res.data.session);
        emitAuth("SIGNED_IN", res.data.session);
      }
      return res;
    },
    async signOut() {
      writeStoredSession(null);
      emitAuth("SIGNED_OUT", null);
      return { error: null };
    },
    async updateUser(attrs: { password?: string }) {
      const meta = readStoredMeta();
      if (!meta) return { data: { user: null }, error: { message: "Hujaingia kwenye akaunti." } };
      return await execLocal<{ data: { user: User | null }; error: null | { message: string } }>({
        kind: "auth",
        action: "updatePassword",
        userId: meta.userId,
        password: attrs.password,
      });
    },
    admin: {
      async deleteUser(uid: string) {
        return await execLocal<{
          data: Record<string, never>;
          error: null | { status?: number; message?: string };
        }>({
          kind: "auth",
          action: "deleteUser",
          userId: uid,
        });
      },
    },
  };

  const storage = {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          if (typeof window === "undefined") {
            return { data: { path, fullPath: path, name: file.name }, error: null };
          }
          const res = await fetch(
            `/api/local-media-upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
            {
              method: "POST",
              headers: { "Content-Type": file.type || "application/octet-stream" },
              body: file,
            },
          );
          if (!res.ok) {
            return { data: null, error: { message: "Imeshindikana kupakia faili" } };
          }
          return { data: { path, fullPath: path, name: file.name }, error: null };
        },
        async createSignedUrl(path: string, _expiresIn: number) {
          const signedUrl =
            path.startsWith("http") || path.startsWith("/")
              ? path
              : `/api/local-media/${bucket}/${path.replace(/^\/+/, "")}`;
          return {
            data: { signedUrl },
            error: null,
          };
        },
      };
    },
  };

  return {
    from: (table: keyof Database["public"]["Tables"] | string) =>
      new MockQueryBuilder(String(table)),
    rpc: (fn: string, args?: Record<string, unknown>) => new MockRpcBuilder(fn, args),
    auth,
    storage,
  };
}

export function hasSupabaseClientEnv(): boolean {
  const url =
    import.meta.env?.["VITE_SUPABASE_URL"] ||
    (typeof process !== "undefined" ? process.env["SUPABASE_URL"] : undefined);
  const key =
    import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    (typeof process !== "undefined" ? process.env["SUPABASE_PUBLISHABLE_KEY"] : undefined);
  return Boolean(url && key);
}

export function hasSupabaseAdminEnv(): boolean {
  if (typeof process === "undefined") return false;
  return Boolean(process.env["SUPABASE_URL"] && process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}
