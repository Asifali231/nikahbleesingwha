import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return new NextResponse(challenge, { status: 200 });
  return new NextResponse('Forbidden', { status: 403 });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    const contactInfo = entry?.contacts?.[0];
    if (!message) return NextResponse.json({ ok: true });
    const phone = message.from;
    const name = contactInfo?.profile?.name || phone;
    let { data: contact } = await supabase.from('contacts').select('*').eq('phone', phone).single();
    if (!contact) {
      const { data } = await supabase.from('contacts').insert({ phone, name }).select().single();
      contact = data;
    }
    let { data: conv } = await supabase.from('conversations').select('*').eq('contact_id', contact.id).single();
    if (!conv) {
      const { data } = await supabase.from('conversations').insert({ contact_id: contact.id, unread_count: 1 }).select().single();
      conv = data;
    } else {
      await supabase.from('conversations').update({ unread_count: conv.unread_count + 1 }).eq('id', conv.id);
    }
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      contact_id: contact.id,
      wamid: message.id,
      direction: 'in',
      type: message.type,
      content: message.text?.body || message.type,
      status: 'delivered'
    });
    await supabase.from('contacts').update({ last_message_at: new Date().toISOString() }).eq('id', contact.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: true });
  }
}
