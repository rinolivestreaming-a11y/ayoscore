import { getStore } from '@netlify/blobs';

export default async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error:'Method not allowed' }), { status:405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error:'Body bukan JSON valid' }), { status:400 });
  }

  // Validasi minimal
  if (!body || !Array.isArray(body.ligas)) {
    return new Response(JSON.stringify({ error:'Data tidak valid' }), { status:400 });
  }

  try {
    const store = getStore({ name:'ayoscore', consistency:'strong' });
    await store.set('data', JSON.stringify(body));

    return new Response(
      JSON.stringify({ success:true, synced:true, ts: Date.now() }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('[sync] Error:', err.message);
    return new Response(
      JSON.stringify({ success:false, error: err.message }),
      { status:500, headers:{ 'Content-Type':'application/json' } }
    );
  }
};

export const config = { path: '/api/sync' };
