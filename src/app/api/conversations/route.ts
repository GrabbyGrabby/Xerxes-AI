import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session.userId && !session.guestId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');

  try {
    if (conversationId) {
      // Fetch messages for a specific conversation
      const { data: conv, error: convErr } = await supabaseServer
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convErr || !conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Check ownership
      if (session.userId && conv.user_id !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.guestId && conv.guest_id !== session.guestId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Fetch messages inside this conversation
      const { data: messages, error: msgErr } = await supabaseServer
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgErr) throw msgErr;

      return NextResponse.json({ messages: messages || [] });
    } else {
      // Fetch all conversations for user or guest
      let query = supabaseServer
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (session.userId) {
        query = query.eq('user_id', session.userId);
      } else {
        query = query.eq('guest_id', session.guestId);
      }

      const { data: conversations, error: convsErr } = await query;
      if (convsErr) throw convsErr;

      return NextResponse.json({ conversations: conversations || [] });
    }
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session.userId && !session.guestId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');
  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
  }

  try {
    const { data: conv, error: convErr } = await supabaseServer
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (session.userId && conv.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.guestId && conv.guest_id !== session.guestId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteErr } = await supabaseServer
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
