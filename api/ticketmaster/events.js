import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const {
    city = "Berlin",
    countryCode = "DE",
    debug = "0"
  } = req.query;

  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Ticketmaster API key missing (TICKETMASTER_API_KEY)"
    });
  }

  // Ticketmaster Discovery API
  const url =
    `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${apiKey}` +
    `&countryCode=${countryCode}` +
    `&city=${encodeURIComponent(city as string)}` +
    `&size=50` +
    `&sort=date,asc`;

  try {
    const response = await fetch(url);

    // ---- HARD DEBUG FOR API FAILURES ----
    if (!response.ok) {
      const body = await response.text();

      console.error("Ticketmaster API error:", {
        status: response.status,
        body,
        url
      });

      if (debug === "1") {
        return res.status(200).json({
          events: [],
          debug: {
            status: response.status,
            body: body.slice(0, 1000),
            url
          }
        });
      }

      return res.status(200).json({ events: [] });
    }

    const data = await response.json();

    const events =
      data?._embedded?.events?.map((event: any) => ({
        id: event.id,
        name: event.name,
        date: event.dates?.start?.localDate ?? null,
        time: event.dates?.start?.localTime ?? null,
        url: event.url ?? null,
        venue: event._embedded?.venues?.[0]?.name ?? null,
        city: event._embedded?.venues?.[0]?.city?.name ?? null,
        country: event._embedded?.venues?.[0]?.country?.countryCode ?? null,
        segment: event.classifications?.[0]?.segment?.name ?? null
      })) ?? [];

    if (debug === "1") {
      return res.status(200).json({
        events,
        debug: {
          eventCount: events.length,
          city,
          countryCode,
          url
        }
      });
    }

    return res.status(200).json({ events });
  } catch (err: any) {
    console.error("Server error in Ticketmaster function:", err);

    if (debug === "1") {
      return res.status(200).json({
        events: [],
        debug: {
          error: err?.message ?? String(err)
        }
      });
    }

    return res.status(200).json({ events: [] });
  }
}
