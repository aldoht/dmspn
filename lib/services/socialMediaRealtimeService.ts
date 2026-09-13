export interface PerfilSocial {
  handle: string;
  seguidores: number | null;
  seguidos: number | null;
  publicaciones: number | null;
  bio: string | null;
  verificada: boolean | null;
  categoria: string | null;
}

export interface RealtimeSocialData {
  plataforma: string;
  encontrado: boolean;
  fragmentoGoogle: string;
  url: string;
  // Métricas del perfil (seguidores, publicaciones...). Null cuando no hay
  // engine disponible (TikTok), no se halló handle o el perfil falló: el
  // llamador degrada a descubrimiento + snippet sin romper nada.
  perfil: PerfilSocial | null;
}

export interface HuellaSocial {
  instagram: RealtimeSocialData | null;
  facebook: RealtimeSocialData | null;
  tiktok: RealtimeSocialData | null;
}

// Caché en memoria por comercio (nombre+ciudad normalizados, TTL 30 min):
// el enriquecimiento cuesta hasta 3 búsquedas SerpApi la primera vez
// (descubrimiento + perfil IG + perfil FB); las repetidas cuestan 0.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { ts: number; data: HuellaSocial }>();

// Tope por llamada de perfil para no bloquear la auditoría si SerpApi tarda.
const TIMEOUT_PERFIL_MS = 12_000;

// Convierte métricas a número: acepta number directo o compactos en inglés
// ("2.8K", "1.2M", "3B", con comas). Null si no es parseable.
function parseCompacto(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().replace(/,/g, "");
  const m = limpio.match(/^(\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!m) return null;
  const base = Number(m[1]);
  const mult = m[2] ? { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase() as "K" | "M" | "B"] : 1;
  return Math.round(base * mult);
}

// Extrae el handle desde la URL descubierta. Instagram: ignora rutas de
// contenido (/p/, /reel/, /explore/); Facebook: acepta /<handle> o
// profile.php?id=<id>. Null si la URL no es un perfil candidateable.
function extraerHandle(url: string, domain: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes(domain)) return null;
    if (domain === "instagram.com") {
      const seg = u.pathname.split("/").filter(Boolean);
      if (seg.length === 0) return null;
      if (["p", "reel", "reels", "explore", "stories", "tv"].includes(seg[0].toLowerCase())) return null;
      return seg[0];
    }
    if (domain === "facebook.com") {
      const id = u.searchParams.get("id");
      if (u.pathname.includes("profile.php") && id) return id;
      const seg = u.pathname.split("/").filter(Boolean);
      if (seg.length === 0) return null;
      if (["pages", "groups", "events", "marketplace", "watch"].includes(seg[0].toLowerCase())) return null;
      return seg[0];
    }
    return null;
  } catch {
    return null;
  }
}

// Llama a un profile engine de SerpApi (instagram_profile / facebook_profile)
// con tope de tiempo. Devuelve el JSON crudo o null ante cualquier fallo:
// el llamador degrada a solo descubrimiento.
async function fetchPerfil(engine: string, profileId: string, apiKey: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `https://serpapi.com/search.json?engine=${engine}&profile_id=${encodeURIComponent(profileId)}&api_key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_PERFIL_MS) });
    if (!res.ok) {
      console.warn(`SerpApi ${engine} para ${profileId}: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (error) {
    console.warn(`SerpApi ${engine} para ${profileId} falló, se degrada a descubrimiento:`, error);
    return null;
  }
}

function numCampo(obj: Record<string, unknown>, ...claves: string[]): number | null {
  for (const c of claves) {
    const v = parseCompacto(obj[c]);
    if (v !== null) return v;
  }
  return null;
}

function strCampo(obj: Record<string, unknown>, ...claves: string[]): string | null {
  for (const c of claves) {
    const v = obj[c];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function boolCampo(obj: Record<string, unknown>, ...claves: string[]): boolean | null {
  for (const c of claves) {
    const v = obj[c];
    if (typeof v === "boolean") return v;
  }
  return null;
}

// Normaliza la respuesta de instagram_profile a PerfilSocial.
function normalizarPerfilIG(data: Record<string, unknown>, handle: string): PerfilSocial {
  return {
    handle,
    seguidores: numCampo(data, "followers", "follower_count"),
    seguidos: numCampo(data, "following", "following_count"),
    publicaciones: numCampo(data, "posts", "media_count", "post_count"),
    bio: strCampo(data, "biography", "bio"),
    verificada: boolCampo(data, "is_verified", "verified"),
    categoria: strCampo(data, "category_name", "business_category_name", "category"),
  };
}

// Normaliza la respuesta de facebook_profile (viene en profile_results).
// FB no expone conteo de publicaciones: queda null y se muestra como tal.
function normalizarPerfilFB(data: Record<string, unknown>, handle: string): PerfilSocial {
  const pr = (data["profile_results"] as Record<string, unknown> | undefined) ?? data;
  return {
    handle,
    seguidores: numCampo(pr, "followers", "likes", "like_count", "follower_count"),
    seguidos: numCampo(pr, "following", "following_count"),
    publicaciones: null,
    bio: strCampo(pr, "profile_intro_text", "description", "about"),
    verificada: boolCampo(pr, "is_verified", "verified"),
    categoria: strCampo(pr, "category"),
  };
}

export async function buscarRedesEnTiempoReal(nombreComercio: string, ciudad: string = ""): Promise<HuellaSocial> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return { instagram: null, facebook: null, tiktok: null };
  }

  const cacheKey = `${nombreComercio.trim().toLowerCase()}|${ciudad.trim().toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return hit.data;
  }

  // Paso 1 (1 búsqueda): descubrimiento simultáneo en las 3 plataformas con
  // dorks de Google. De aquí salen las URLs y los handles a enriquecer.
  const query = encodeURIComponent(`site:instagram.com OR site:facebook.com OR site:tiktok.com "${nombreComercio}" ${ciudad}`);

  try {
    const res = await fetch(`https://serpapi.com/search.json?engine=google&q=${query}&api_key=${apiKey}`);
    const data = await res.json();
    const resultados: { link?: string; snippet?: string }[] = data.organic_results || [];

    const base = (domain: string): Omit<RealtimeSocialData, "perfil"> => {
      const match = resultados.find((r) => r.link && r.link.includes(domain));
      return {
        plataforma: domain,
        encontrado: !!match,
        fragmentoGoogle: match?.snippet ?? "No indexed presence found.",
        url: match?.link ?? "",
      };
    };

    const ig = base("instagram.com");
    const fb = base("facebook.com");
    const tk = base("tiktok.com");

    // Paso 2 (hasta +2 búsquedas, en paralelo): enriquecer IG y FB con sus
    // profile engines. TikTok no tiene engine en SerpApi: se queda con
    // descubrimiento + snippet (perfil null).
    const [perfilIG, perfilFB] = await Promise.all([
      (async (): Promise<PerfilSocial | null> => {
        const handle = ig.url ? extraerHandle(ig.url, "instagram.com") : null;
        if (!handle) return null;
        const data = await fetchPerfil("instagram_profile", handle, apiKey);
        return data ? normalizarPerfilIG(data, handle) : null;
      })(),
      (async (): Promise<PerfilSocial | null> => {
        const handle = fb.url ? extraerHandle(fb.url, "facebook.com") : null;
        if (!handle) return null;
        const data = await fetchPerfil("facebook_profile", handle, apiKey);
        return data ? normalizarPerfilFB(data, handle) : null;
      })(),
    ]);

    const huella: HuellaSocial = {
      instagram: { ...ig, perfil: perfilIG },
      facebook: { ...fb, perfil: perfilFB },
      tiktok: { ...tk, perfil: null },
    };
    cache.set(cacheKey, { ts: Date.now(), data: huella });
    return huella;
  } catch (error) {
    console.error("Error en SerpAPI:", error);
    return { instagram: null, facebook: null, tiktok: null };
  }
}
