import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  console.log('Transcription API called');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  let tempFilePath: string | null = null;

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;

    console.log('Audio file received:', {
      size: audioFile?.size,
      type: audioFile?.type,
      name: audioFile?.name
    });

    if (!audioFile) {
      console.error('No audio file provided');
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile.size === 0) {
      console.error('Audio file is empty');
      return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 });
    }

    // Convert Blob to Buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    console.log('Audio buffer size:', buffer.length);

    // Create a temporary file with proper extension
    const tempDir = os.tmpdir();
    const fileExtension = audioFile.type.includes('webm') ? 'webm' : 'mp3';
    tempFilePath = path.join(tempDir, `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`);
    
    console.log('Writing temp file to:', tempFilePath);
    await fs.writeFile(tempFilePath, buffer);

    // Verify file was written
    const stats = await fs.stat(tempFilePath);
    console.log('Temp file stats:', { size: stats.size, isFile: stats.isFile() });

    // Transcribe using Whisper model
    console.log('Starting transcription...');
    const transcription = await openai.audio.transcriptions.create({
      file: fsSync.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'en',
    });

    console.log('Transcription successful:', transcription.text);

    // Clean up temp file
    await fs.unlink(tempFilePath);
    tempFilePath = null;

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up temp file in case of error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log('Cleaned up temp file');
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError);
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to transcribe audio', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
