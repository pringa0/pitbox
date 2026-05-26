export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { carName } = req.body;

  if (!carName) {
    return res.status(400).json({ error: 'carName is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `以下の車名のカテゴリーを答えてください。カテゴリーのみ一言で答えてください。\n車名：${carName}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'カテゴリー不明';

    return res.status(200).json({ category: result });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}