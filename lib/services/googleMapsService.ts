export interface PlacesResult {
  encontrado: boolean;
  nombre?: string;
  direccion?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
}

export async function consultarGoogleMaps(nombreComercio: string, ciudad: string = ""): Promise<PlacesResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn("GOOGLE_PLACES_API_KEY no configurada");
    return { encontrado: false };
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Especificamos los campos que deseamos recibir para optimizar costo y velocidad
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: `${nombreComercio} ${ciudad}`.trim(),
      }),
    });

    if (!response.ok) {
      console.error("Error consultando Places API:", await response.text());
      return { encontrado: false };
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return { encontrado: false };
    }

    const lugar = data.places[0];

    return {
      encontrado: true,
      nombre: lugar.displayName?.text || nombreComercio,
      direccion: lugar.formattedAddress || 'Address not available',
      rating: lugar.rating || 0,
      userRatingCount: lugar.userRatingCount || 0,
      businessStatus: lugar.businessStatus || 'OPERATIONAL',
      googleMapsUri: lugar.googleMapsUri || '',
    };
  } catch (error) {
    console.error("Excepción en consultarGoogleMaps:", error);
    return { encontrado: false };
  }
}