import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { roomName, identity, name, isHost } = req.body || {};
    if (!roomName || !identity) return res.status(400).json({ error: 'Missing fields' });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) return res.status(500).json({ error: 'LiveKit env missing' });

    const at = new AccessToken(apiKey, apiSecret, { identity, name });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: !!isHost,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return res.json({ token });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
