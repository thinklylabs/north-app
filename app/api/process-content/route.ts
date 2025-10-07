import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { chunkBySourceType } from '@/lib/chunking';
import { generateEmbedding } from '@/lib/embeddings';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Disabled. Use /api/process-raw.' }, { status: 410 })
}
