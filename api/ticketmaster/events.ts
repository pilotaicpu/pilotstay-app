import type { VercelRequest, VercelResponse } from "@vercel/node";

// Erzwingt Node 18 Runtime (global fetch vorhanden)
export const config = {
  runtime: "nodejs18.x",
};

function pickQueryString(q: unknown, fallback = ""): string {
  if (typeof q === "string") return q;
  if (Array.isArray(q) && typeof q[0] === "string") return q[0];
  return fallback;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cityRaw = pickQueryString(req.query.city, "Berlin");
    const countryCodeRaw = pickQueryString(req.query.countryCode, "DE");

    const city = cityRaw.trim();
    const countryCode = countryCodeRaw.trim().toUpperCase();

    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Ticketmaster API key missing (set TICKETMASTER_API_KEY in Vercel env vars)",
      });
    }

    const url =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${encodeURIComponent(apiKey)}` +
      `&city=${encodeURIComponent(city)}` +
      `&countryCode=${encodeURIComponent(countryCode)}` +
      `&size=50&sort=date,asc`;

    const response = await fetch(url);

    // Wenn Ticketmaster blockt / Key falsch / RateLimit etc → zeig es sauber an
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res.status(500).json({
        error: "Ticketmaster API error",
        status: response.status,
        statusText: response.statusText,
        body: text.slice(0, 800),
        requested: { city, countryCode },
      });
    }

    const data: any = await response.json();

    const events =
      data?._embedded?.events?.map((event: any) => ({
        id: event.id,
        name: event.name,
        date: event?.dates?.start?.localDate ?? null,
        url: event.url ?? null,
        venue: event?._embedded?.venues?.[0]?.name ?? null,
        city: event?._embedded?.venues?.[0]?.city?.name ?? city,
      })) ?? [];

    // Optional: Cache, damit Ticketmaster nicht dauernd gerufen wird
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json({ events, meta: { city, countryCode, count: events.length } });
  } catch (err: any) {
    return res.status(500).json({
      error: "Unhandled server error in /api/ticketmaster/events",
      message: err?.message ?? String(err),
      stack: err?.stack ?? null,
    });
  }
}
