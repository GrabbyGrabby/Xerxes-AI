import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session.userId && !session.guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let credits = 0;
    let transactions: any[] = [];

    if (session.userId) {
      // 1. Registered Privy User
      // Check if profile exists
      let { data: profile, error: profileErr } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', session.userId)
        .single();

      if (profileErr || !profile) {
        // First login: Auto-create profile and grant initial credits
        const { error: insertErr } = await supabaseServer
          .from('profiles')
          .insert({
            id: session.userId,
            credits: 0, // calculated from ledger
          });

        if (!insertErr) {
          // Add transaction row
          await supabaseServer.from('credit_transactions').insert({
            user_id: session.userId,
            amount: 500,
            reason: 'Initial Sign-up Credit Grant',
          });

          // Fetch again to get updated state
          const { data: newProfile } = await supabaseServer
            .from('profiles')
            .select('*')
            .eq('id', session.userId)
            .single();
          profile = newProfile;
        }
      }

      credits = profile?.credits ?? 0;

      // Fetch transaction ledger
      const { data: txs } = await supabaseServer
        .from('credit_transactions')
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false });
      
      transactions = txs || [];

    } else if (session.guestId) {
      // 2. Anonymous Guest Session
      let { data: guest, error: guestErr } = await supabaseServer
        .from('guest_sessions')
        .select('*')
        .eq('guest_id', session.guestId)
        .single();

      if (guestErr || !guest) {
        // Auto-create guest session
        const { error: insertErr } = await supabaseServer
          .from('guest_sessions')
          .insert({
            guest_id: session.guestId,
            credits: 0,
          });

        if (!insertErr) {
          // Add transaction
          await supabaseServer.from('credit_transactions').insert({
            guest_id: session.guestId,
            amount: 50,
            reason: 'Anonymous Guest Credit Grant',
          });

          const { data: newGuest } = await supabaseServer
            .from('guest_sessions')
            .select('*')
            .eq('guest_id', session.guestId)
            .single();
          guest = newGuest;
        }
      }

      credits = guest?.credits ?? 0;

      // Fetch transaction ledger
      const { data: txs } = await supabaseServer
        .from('credit_transactions')
        .select('*')
        .eq('guest_id', session.guestId)
        .order('created_at', { ascending: false });
      
      transactions = txs || [];
    }

    return NextResponse.json({
      credits,
      transactions,
    });
  } catch (error: any) {
    console.error('Credits endpoint GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session.userId && !session.guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, reason, transactionHash } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
    }

    // Insert transaction
    const { data: txData, error: txError } = await supabaseServer
      .from('credit_transactions')
      .insert({
        user_id: session.userId || null,
        guest_id: session.guestId || null,
        amount: amount,
        reason: reason || (transactionHash ? `Web3 Top-up (tx: ${transactionHash.slice(0, 10)}...)` : 'Credit Purchase'),
      })
      .select()
      .single();

    if (txError) {
      return NextResponse.json({ error: `Transaction failed: ${txError.message}` }, { status: 500 });
    }

    // Get new balance
    let newBalance = 0;
    if (session.userId) {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('credits')
        .eq('id', session.userId)
        .single();
      newBalance = profile?.credits ?? 0;
    } else if (session.guestId) {
      const { data: guest } = await supabaseServer
        .from('guest_sessions')
        .select('credits')
        .eq('guest_id', session.guestId)
        .single();
      newBalance = guest?.credits ?? 0;
    }

    return NextResponse.json({
      success: true,
      transaction: txData,
      newBalance,
    });
  } catch (error: any) {
    console.error('Credits endpoint POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
