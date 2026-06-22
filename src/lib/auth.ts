import { NextRequest } from 'next/server';

export interface AuthSession {
  userId?: string;    // Privy User DID (registered)
  guestId?: string;   // LocalStorage Guest UUID (guest)
}

export async function getAuthSession(req: NextRequest): Promise<AuthSession> {
  const authHeader = req.headers.get('Authorization');
  const guestHeader = req.headers.get('x-guest-id');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        // Decode the Privy JWT
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          
          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && now < payload.exp) {
            const userId = payload.sub || payload.userId;
            if (userId) {
              return { userId };
            }
          }
        }
      } catch (error) {
        console.error('Error parsing Privy JWT token:', error);
      }
    }
  }

  // Fallback to guest_id if provided
  if (guestHeader && guestHeader.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return { guestId: guestHeader };
  }

  return {};
}
