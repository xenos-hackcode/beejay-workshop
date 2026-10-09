const { list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { blobs } = await list({ prefix: 'gallery/' });
    const images = blobs
      .slice()
      .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))
      .map((b) => b.url);
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=120');
    res.status(200).json({ images });
  } catch (e) {
    res.status(200).json({ images: [] });
  }
};
