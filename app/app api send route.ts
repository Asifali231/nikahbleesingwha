import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function POST(req: NextRequest) {
  const { to, message, conversation_id, contact_id } = await req.json();
  const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } })
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: 400 });
  const wamid = data.messages?.[0]?.id;
  await supabase.from('messages').insert({ conversation_id, contact_id, wamid, direction: 'out', type: 'text', content: message, status: 'sent' });
  return NextResponse.json({ success: true, wamid });
}
