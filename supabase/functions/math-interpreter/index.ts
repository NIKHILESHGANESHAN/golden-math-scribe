const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are a mathematical problem interpreter. Your job is to analyze a user's math input and produce a structured JSON response.

You MUST return ONLY valid JSON with this exact structure:
{
  "category": "algebra|calculus|linear_algebra|differential_equations|statistics|probability|geometry|trigonometry|optimization|engineering|arithmetic",
  "problemType": "short description of the problem type",
  "extractedValues": { "key": "value" },
  "formula": "the mathematical formula or equation in LaTeX notation",
  "wolframQuery": "the best Wolfram Alpha compatible query string",
  "alternateQueries": ["backup query 1", "backup query 2"],
  "interpretation": "A clear sentence describing what the problem is asking",
  "steps": [
    { "title": "Step title", "detail": "What this step does mathematically" }
  ]
}

Rules:
1. The wolframQuery must be optimized for the Wolfram Alpha Full Results API.
2. For word problems, extract all numerical values and convert to a mathematical expression.
3. For statistics problems (hypothesis testing, z-test, t-test, chi-square, etc.), compute the formula and send the direct calculation as the wolframQuery.
   Example: "z = (160 - 165) / (10 / sqrt(100))" → wolframQuery: "(160 - 165) / (10 / sqrt(100))"
4. For calculus: use "differentiate", "integrate", "limit" keywords.
5. For algebra: use "solve" keyword.
6. Always provide at least 2 alternateQueries as fallbacks with simpler phrasing.
7. The formula should be in LaTeX notation for display.
8. The steps array should outline the mathematical approach (3-6 steps).
9. If the input is already a clean math expression, just pass it through with minimal changes.
10. NEVER include any text outside the JSON object.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, imageText } = await req.json();
    const input = imageText || query;

    if (!input || typeof input !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${errText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Math interpreter error:', err);
    return new Response(JSON.stringify({ error: 'Failed to interpret problem', message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
