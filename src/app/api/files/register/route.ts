import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { parseFileFromUrl, chunkText } from '@/lib/parser';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session.userId && !session.guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { cid, filename, mimeType, size } = body;

    if (!cid) {
      return NextResponse.json({ error: 'CID is required' }, { status: 400 });
    }

    const gatewayUrl = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud'}/ipfs/${cid}`;

    // Write file metadata to Supabase files table
    const { data: fileData, error: fileError } = await supabaseServer
      .from('files')
      .insert({
        user_id: session.userId || null,
        guest_id: session.guestId || null,
        cid,
        filename,
        mime_type: mimeType,
        size_bytes: size,
        gateway_url: gatewayUrl,
      })
      .select()
      .single();

    if (fileError || !fileData) {
      console.error('Supabase file registration error:', fileError);
      return NextResponse.json({ error: `Supabase write failed: ${fileError?.message}` }, { status: 500 });
    }

    // Check if the file contains text contents we can extract
    const isTextExtractable =
      mimeType === 'application/pdf' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType.includes('docx') ||
      mimeType.includes('csv') ||
      mimeType.startsWith('text/') ||
      mimeType.includes('json');

    if (isTextExtractable) {
      try {
        const text = await parseFileFromUrl(gatewayUrl, mimeType);
        if (text && text.trim()) {
          const chunks = chunkText(text);
          if (chunks.length > 0) {
            const chunkRows = chunks.map((c) => ({
              file_id: fileData.id,
              chunk_text: c,
            }));

            // Insert chunk rows into database
            const { error: chunkError } = await supabaseServer
              .from('file_chunks')
              .insert(chunkRows);

            if (chunkError) {
              console.error('Failed to store document chunks in database:', chunkError);
            }
          }
        }
      } catch (parseError) {
        console.error('Document parsing/chunking failed:', parseError);
        // Do not fail file registration, since the IPFS pin was successful
      }
    }

    return NextResponse.json({ file: fileData });
  } catch (error: any) {
    console.error('File registration route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
