import { supabase } from '@/lib/supabase-client';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  try {
    const { data, error } = await supabase.from('rooms').select('id,status').limit(1);
    if (error) {
      return new Response(
        JSON.stringify({ ok: false, env: { url, hasKey }, error: error.message }),
        { status: 500 }
      );
    }
    return Response.json({ ok: true, env: { url, hasKey }, sample: data?.[0] ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return new Response(
      JSON.stringify({ ok: false, env: { url, hasKey }, error: msg }),
      { status: 500 }
    );
  }
}
