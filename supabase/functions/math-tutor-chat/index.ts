const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are an expert mathematics tutor inside the GoldenRatio learning platform. Your role is to explain mathematical concepts clearly, like a supportive university instructor.

Guidelines:
1. Explain concepts step by step in clear academic language.
2. Use LaTeX notation for all formulas: wrap inline math in single dollar signs like $formula$ and display math in double dollar signs like $$formula$$.
3. Include intuitive explanations alongside formal definitions.
4. Provide small worked examples when helpful.
5. Cover all areas: algebra, calculus, statistics, probability, linear algebra, differential equations, optimization, geometry, trigonometry, combinatorics, numerical analysis, abstract algebra, topology, and engineering mathematics.
6. When explaining a concept, structure your response with:
   - A clear definition
   - The key formula(s)
   - A simple example
   - Intuitive explanation of why it works
7. Encourage learning by occasionally asking "Would you like to see another example?" or "Shall I explain this differently?"
8. If the student asks about a specific problem, walk through the solution step by step.
9. Keep responses focused and educational — avoid unnecessary filler.
10. Use markdown formatting: headers (##), bold (**text**), bullet points, and numbered lists for clarity.
11. If the student's question relates to the problem context provided, reference that specific problem in your explanation.
12. If a student describes a wrong step, identify the error, explain why it is incorrect, and show the correct approach.
13. For advanced topics (machine learning math, numerical methods, Bayesian inference), provide both intuition and formal treatment.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing messages array' }), {
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

    // Build system prompt with optional problem context
    let systemPrompt = SYSTEM_PROMPT;
    if (context && context.query) {
      systemPrompt += `\n\nCurrent problem context (the student just solved this problem):
Problem: ${context.query}
Answer: ${context.answer}
Category: ${context.category || 'general'}

If the student asks follow-up questions, reference this problem to provide contextual explanations.`;
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
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (err) {
    console.error('Math tutor chat error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
