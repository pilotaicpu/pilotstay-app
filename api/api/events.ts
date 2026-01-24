import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Ticketmaster API key missing'
    });
  }

  // Query-Parameter
  const {
    city = 'Berlin',
    countryCode = 'DE',
    size = '10'
  } = req.query;

  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.append('apikey', apiKey);
  url.searchParams.append('countryCode', String(countryCode));
  url.searchParams.append('city', String(city));
  url.searchParams.append('size', String(size));
  url.searchParams.append('sort', 'date,asc');

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Ticketmaster error ${response.status}`);
    }

    const data = await response.json();

    const events = (data._embedded?.events || []).map((event: any) => ({
      id: event.id,
      name: event.name,
      date: event.dates.start.localDate,
      time: event.dates.start.localTime || null,
      venue: event._embedded?.venues?.[0]?.name || 'Unknown venue',
      city: event._embedded?.venues?.[0]?.city?.name || city,
      image: event.images?.[0]?.url || null,
      url: event.url
    }));

    return res.status(200).json({
      events,
      source: 'ticketmaster',
      city,
      count: events.length
    });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to load events',
      details: error.message
    });
  }
}
