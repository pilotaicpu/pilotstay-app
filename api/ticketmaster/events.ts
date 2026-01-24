import type { VercelRequest, VercelResponse } from "@vercel/node";

function normalizeCity(city: string) {
  return city
    .replace("ä", "ae")
    .replace("ö", "oe")
    .replace("ü", "ue")
    .replace("Ä", "Ae")
    .replace("Ö", "Oe")
    .replace("Ü", "Ue");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const cityRaw = (req.query.city as string) || "Berlin";
    const countryCode = (req.query.countryCode as string) || "DE";
    const city = normalizeCity(cityRaw);

    const apiKey = process.env.TICKETMASTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Ticketmaster API key missing" });
    }

    const url =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${apiKey}` +
      `&city=${encodeURIComponent(city)}` +
      `&countryCode=${countryCode}` +
      `&size=20` +
      `&sort=date,asc`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      console.error("Ticketmaster error:", text);
      return res.status(200).json({ events: [] });
    }

    const data = await response.json();

    const events =
      data?._embedded?.events?.map((event: any) => ({
        id: event.id,
        name: event.name,
        date: event.dates?.start?.localDate,
        url: event.url,
        venue: event._embedded?.venues?.[0]?.name,
        city: event._embedded?.venues?.[0]?.city?.name,
      })) || [];

    return res.status(200).json({ events });
  } catch (err: any) {
    console.error("EVENT FUNCTION CRASH:", err);
    return res.status(200).json({ events: [] });
  }
}
