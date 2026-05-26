export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const systemText = system ? system + "\n\n" : "";
  
  const userText = messages?.map(m => {
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) return m.content.map(c => c.text || '').join('');
    return JSON.stringify(m.content);
  }).join("\n") || "";

  const fullText = systemText + userText;

  console.log("=== GEMINI REQUEST ===");
  console.log("fullText length:", fullText.length);
  console.log("apiKey exists:", !!apiKey);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullText }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log("=== GEMINI RESPONSE ===");
    console.log(JSON.stringify(data));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (error) {
    console.error("ERROR:", error.message);
    return res.status(500).json({ error: error.message });
  }
}