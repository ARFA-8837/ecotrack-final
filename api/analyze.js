// Vercel Serverless Function
// This runs on the server, so your API key stays hidden from users.
// Uses Google Gemini API (free tier) instead of a paid provider.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transport, electricity, food, waste, notes } = req.body;

  if (!transport || !electricity || !food || !waste) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const SYSTEM_PROMPT = `You are EcoTrack, a friendly and encouraging environmental sustainability coach for university students in Pakistan.

You will receive a short description of a student's daily habits across four categories: commute/transport, electricity use, food choices, and waste handling. You may also receive optional free-text notes.

Your job:
1. Estimate an "Eco Score" from 0 to 100, where 100 means very low environmental impact for that day, and 0 means very high impact. Weigh transport and electricity slightly more heavily than food and waste, since they typically have larger footprints. Use your judgment reasonably and consistently — do not just default to a fixed number.
2. Write a short, warm, non-judgmental summary (2-3 sentences) of the day's impact, mentioning the specific habits the student reported.
3. Give exactly ONE specific, realistic, actionable tip for tomorrow, tailored to the weakest area in their habits (the one dragging the score down most). The tip should be doable by a student on a campus in Pakistan — no expensive or impractical suggestions.

Tone: encouraging and constructive, never preachy or guilt-inducing. This is a student building a daily habit, not being punished.

You MUST respond with ONLY a valid JSON object in exactly this shape, with no markdown formatting, no code fences, and no extra text before or after it:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence summary>",
  "tip": "<one specific actionable tip>"
}`;

  const userMessage = `Today's habits:
- Transport: ${transport}
- Electricity use: ${electricity}
- Food: ${food}
- Waste: ${waste}
${notes ? `- Additional notes: ${notes}` : ''}

Give me my Eco Score, summary, and tip in the required JSON format.`;

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', rawText);
      return res.status(500).json({ error: 'Could not parse AI response' });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
