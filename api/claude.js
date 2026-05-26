export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("受信body:", JSON.stringify(req.body));

  const systemText = system ? system + "\n\n" : "";
  const userText = messages?.map(m => 
    typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
  ).join("\n") || "";

  console.log("Geminiに送るテキスト:", systemText + userText);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemText + userText }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log("Geminiレスポンス:", JSON.stringify(data));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (error) {
    console.error("エラー:", error.message);
    return res.status(500).json({ error: error.message });
  }
}