import fetch from "node-fetch";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { city = 'Berlin', countryCode = 'DE' } = req.query;

  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Ticketmaster API key missing',
    });
  }

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&city=${encodeURIComponent(
    city as string
  )}&countryCode=${countryCode}&size=20&sort=date,asc`;

  try {
    const response = await fetch(url);
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

    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}
