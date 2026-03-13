const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function queryWolfram(query: string, appId: string) {
  const params = new URLSearchParams({
    input: query,
    appid: appId,
    output: 'json',
    format: 'plaintext,image',
  });

  const res = await fetch(`https://api.wolframalpha.com/v2/query?${params}`);
  const data = await res.json();
  const result = data?.queryresult;

  if (!result || result.success === false || !result.pods || result.pods.length === 0) {
    return null;
  }

  return result.pods.map((pod: any) => ({
    title: pod.title,
    subpods: pod.subpods?.map((sp: any) => ({
      plaintext: sp.plaintext || '',
      img: sp.img?.src || null,
    })) || [],
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, alternateQueries } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('WOLFRAM_APP_ID');
    if (!appId) {
      return new Response(JSON.stringify({ error: 'Wolfram API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try primary query
    let pods = await queryWolfram(query, appId);

    // If primary fails, try alternate queries
    if (!pods && alternateQueries && Array.isArray(alternateQueries)) {
      for (const altQuery of alternateQueries) {
        pods = await queryWolfram(altQuery, appId);
        if (pods) break;
      }
    }

    if (!pods) {
      return new Response(JSON.stringify({ error: 'No result found', success: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, pods }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
