export interface RealtimeSocialData {
  plataforma: string;
  encontrado: boolean;
  fragmentoGoogle: string;
  url: string;
}

export async function buscarRedesEnTiempoReal(nombreComercio: string, ciudad: string = "") {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return { instagram: null, facebook: null, tiktok: null };
  }

  // Buscamos simultáneamente en las 3 plataformas usando dorks de Google
  const query = encodeURIComponent(`site:instagram.com OR site:facebook.com OR site:tiktok.com "${nombreComercio}" ${ciudad}`);
  
  try {
    const res = await fetch(`https://serpapi.com/search.json?engine=google&q=${query}&api_key=${apiKey}`);
    const data = await res.json();
    const resultados: { link?: string; snippet?: string }[] = data.organic_results || [];

    const encontrarRed = (domain: string): RealtimeSocialData => {
      const match = resultados.find((r) => r.link && r.link.includes(domain));
      return {
        plataforma: domain,
        encontrado: !!match,
        fragmentoGoogle: match?.snippet ?? "No indexed presence found.",
        url: match?.link ?? "",
      };
    };

    return {
      instagram: encontrarRed("instagram.com"),
      facebook: encontrarRed("facebook.com"),
      tiktok: encontrarRed("tiktok.com"),
    };
  } catch (error) {
    console.error("Error en SerpAPI:", error);
    return { instagram: null, facebook: null, tiktok: null };
  }
}