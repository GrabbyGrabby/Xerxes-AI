import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session.userId && !session.guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pinataJwt = process.env.PINATA_JWT;
    if (!pinataJwt) {
      return NextResponse.json({ error: 'Pinata JWT not configured' }, { status: 500 });
    }

    // Call Pinata keys creation endpoint to get a single-use upload token
    const response = await fetch('https://api.pinata.cloud/v3/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify({
        keyName: `NexusAI-Upload-${Date.now()}`,
        permissions: {
          endpoints: {
            pinning: {
              pinFileToIPFS: true,
              pinJSONToIPFS: true
            }
          }
        },
        maxUses: 1
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Pinata key generation error:', err);
      return NextResponse.json({ error: `Pinata service error: ${err}` }, { status: response.status });
    }

    const data = await response.json();
    
    // Pinata returns JWT in key JWT
    return NextResponse.json({
      jwt: data.JWT,
    });
  } catch (error: any) {
    console.error('Upload URL error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
