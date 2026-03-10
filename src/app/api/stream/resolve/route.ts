import { NextRequest, NextResponse } from 'next/server';
import { resolveSource, isSupportedHosting } from '@/lib/streaming';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, hosting, iframe_url, src } = body;

    // Get the source URL from various possible field names
    const sourceUrl = url || iframe_url || src;

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    if (!hosting) {
      return NextResponse.json(
        { success: false, error: 'Missing hosting parameter' },
        { status: 400 }
      );
    }

    // Check if hosting is supported
    if (!isSupportedHosting(hosting)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Hosting provider "${hosting}" is not supported. Supported: voe.sx`,
          supported: false 
        },
        { status: 400 }
      );
    }

    // Resolve the source
    const result = await resolveSource(sourceUrl, hosting);

    if (result.success && result.direct_url) {
      return NextResponse.json({
        success: true,
        direct_url: result.direct_url,
        cached: result.cached || false,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Could not resolve source' },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Error resolving source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve source' },
      { status: 500 }
    );
  }
}
