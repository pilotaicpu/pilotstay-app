export default async function handler(req, res) {
  try {
    const { city = "Berlin", countryCode = "DE" } = req.query || {};
    const apiKey = process.env.TICKETMASTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "TICKETMASTER_API_KEY missing on server" });
    }

    const url =
      "https://app.ticketmaster.com/discovery/v2/events.json" +
      `?apikey=${encodeURIComponent(apiKey)}` +
      `&city=${encodeURIComponent(city)}` +
      `&countryCode=${encodeURIComponent(countryCode)}` +
      `&size=50&sort=date,asc`;

    const response = await fetch(url);
    const data = await response.json();

    const rawEvents = data?._embedded?.events || [];

    const events = rawEvents.map((ev) => ({
      id: ev.id,
      name: ev.name,
      date: ev?.dates?.start?.localDate || null,
      url: ev.url || null,
      venue: ev?._embedded?.venues?.[0]?.name || null,
      city: ev?._embedded?.venues?.[0]?.city?.name || city,
    }));

    return res.status(200).json({ events });
  } catch (err) {
    return res.status(500).json({
      error: "Ticketmaster proxy failed",
      details: String(err?.message || err),
    });
  }
}
