// Optional: auto-generate the original reflection from the verse meaning via an
// LLM. Faithful, uplifting, non-controversial, < 60 words. If no key is set the
// pipeline just uses the reflection already in the brief.

export async function generateReflection({translation, reference}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null; // caller falls back to brief.reflection

  const prompt =
    `Write ONE original, uplifting reflection inspired by the meaning of this ` +
    `Qur'an verse. Keep it under 60 words, warm and personal, faithful to the ` +
    `verse's general meaning, and avoid any controversial or sectarian ` +
    `interpretation. Do not quote the verse back. Output only the reflection.\n\n` +
    `Verse (${reference}): "${translation}"`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [{role: 'user', content: prompt}],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || null;
}
