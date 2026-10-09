const { put } = require('@vercel/blob');

const MAX_BYTES = 8 * 1024 * 1024;

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const password = body.password;
  if (typeof password !== 'string' || password !== process.env.GALLERY_PASSWORD) {
    res.status(401).json({ error: 'Wrong password.' });
    return;
  }

  if (body.action === 'verify') {
    res.status(200).json({ ok: true });
    return;
  }

  const contentType = body.contentType;
  const data = body.data;

  if (!data || typeof data !== 'string' || typeof contentType !== 'string' || !contentType.startsWith('image/')) {
    res.status(400).json({ error: 'No image received.' });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(data, 'base64');
  } catch (e) {
    res.status(400).json({ error: 'Invalid image data.' });
    return;
  }

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    res.status(413).json({ error: 'Image is too large.' });
    return;
  }

  const ext = (contentType.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
  const name = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const blob = await put(name, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    res.status(200).json({ url: blob.url });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed.' });
  }
};
