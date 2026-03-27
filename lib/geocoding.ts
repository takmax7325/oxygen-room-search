/**
 * Google Maps Geocoding APIを使用して住所を緯度経度に変換する
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address || !process.env.GOOGLE_MAPS_API_KEY) return null;

  const url = new URL(
    'https://maps.googleapis.com/maps/api/geocode/json'
  );
  url.searchParams.set('address', address);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('region', 'JP');
  url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 86400 }, // 24時間キャッシュ
      });

      if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);

      const data = await res.json();

      if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }

      if (data.status === 'ZERO_RESULTS') return null;
      throw new Error(`Geocoding status: ${data.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await sleep(500 * (attempt + 1));
    }
  }

  console.error('Geocoding failed:', lastError?.message);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
