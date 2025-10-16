"use client";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import { Old_Standard_TT } from "next/font/google";
import { useState, useRef } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function DashboardPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Function to start/stop recording
  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      console.log('Stopping recording...');
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        
        // Try different MIME types for better browser compatibility
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/wav')) {
            mimeType = 'audio/wav';
          } else {
            mimeType = 'audio/webm'; // fallback
          }
        }
        
        console.log('Using MIME type:', mimeType);
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          console.log('Audio data available, size:', event.data.size);
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          console.log('Recording stopped, processing audio...');
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Audio blob created:', {
            size: audioBlob.size,
            type: audioBlob.type
          });
          
          if (audioBlob.size === 0) {
            console.error('Audio blob is empty');
            alert('No audio was recorded. Please try again.');
            return;
          }
          
          await transcribeAudio(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          alert('Recording error occurred. Please try again.');
        };

        mediaRecorder.start(1000); // Collect data every second
        setIsRecording(true);
        console.log('Recording started');
      } catch (error) {
        console.error('Mic access error:', error);
        alert('Could not access microphone. Check permissions and try again.');
      }
    }
  };

  // Function to send audio to API and update transcript
  const transcribeAudio = async (audioBlob: Blob) => {
    console.log('Starting transcription process...');
    setIsTranscribing(true);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${audioBlob.type.split('/')[1] || 'webm'}`);

    try {
      console.log('Sending audio to API...');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        throw new Error(`Transcription failed: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Transcription result:', result);
      
      if (result.text && result.text.trim()) {
        setTranscript(result.text);
        console.log('Transcript set successfully:', result.text);
        // Auto-save the transcribed content
        try {
          await saveMessage(result.text);
        } catch (e) {
          console.error('Failed to save transcribed message:', e);
        }
      } else {
        console.warn('Empty transcription result');
        alert('No speech was detected. Please try speaking more clearly.');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to transcribe: ${errorMessage}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Function to save a message to the database via API
  const saveMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to save message');
      }
      return await res.json();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Home</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-[140px]">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Home</h1>

        <div className="mt-[16px] relative mx-auto max-w-[720px] md:max-w-[840px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)] pt-5 pb-16 px-5 focus-within:ring-2 focus-within:ring-[#1DC6A1]/20 focus-within:border-[#1DC6A1]/40 transition-[box-shadow,border-color]">
            <textarea
              className="w-full min-h-[120px] bg-white text-[#0D1717] text-[12px] leading-[1.3em] mb-4 outline-none resize-none placeholder:text-[#959595]"
              placeholder="Got an idea or some random inspiration? Ask your north AM to include that in your weekly content plan"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <Button
              type="button"
              className="absolute left-5 bottom-5 inline-flex items-center justify-center gap-2 w-[74px] h-[27px] rounded-[5px] bg-[#FCF9F5] hover:bg-[#FCF9F5] border border-[#171717] [border-width:0.5px] p-0"
            >
              <svg
                width="15"
                height="16"
                viewBox="0 0 16 16"
                fill="#1DC6A1"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.5 1L5 8.5H8.5L6.5 15L12 7.5H8.5L9.5 1Z" />
              </svg>
              <span className="text-[10px] text-[#171717]">Priority</span>
            </Button>
            
            {/* Microphone Button - positioned to the left */}
            <Button
              type="button"
              className={`absolute right-[70px] bottom-5 inline-flex items-center justify-center w-[27px] h-[27px] rounded-[5px] border border-[#171717] [border-width:0.5px] p-0 cursor-pointer ${
                isRecording 
                  ? 'bg-red-200 border-red-400' 
                  : 'bg-[#FCF9F5] hover:bg-[#F0ECE6]'
              } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleMicClick}
              disabled={isTranscribing}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isTranscribing ? (
                <div className="w-3 h-3 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className={isRecording ? "text-red-600" : "text-[#171717]"}
                >
                  <path 
                    d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1ZM19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19ZM11 22H13V24H11V22Z" 
                    fill="currentColor"
                  />
                </svg>
              )}
            </Button>
            
            <Button
              type="button"
              className="absolute right-5 bottom-5 inline-flex items-center justify-center w-[27px] h-[27px] rounded-[5px] bg-[#FCF9F5] hover:bg-[#F0ECE6] border border-[#171717] [border-width:0.5px] p-0 cursor-pointer"
              aria-label="Send"
              onClick={async () => {
                try {
                  await saveMessage(transcript);
                } catch (e) {
                  console.error(e);
                  alert(e instanceof Error ? e.message : 'Failed to save');
                }
              }}
              disabled={isSaving || isTranscribing}
            >
              {isSaving ? (
                <div className="w-3 h-3 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-[10px] text-[#171717]">↑</span>
              )}
            </Button>
          </div>

        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>Metrics</h2>

        <div className="mt-[20px] grid grid-cols-1 md:grid-cols-2 gap-[22px]">
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">Activity</span>
          </div>
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">Impressions</span>
          </div>
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">Engagements</span>
          </div>
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">Followers</span>
          </div>
        </div>
      </div>
    </div>
  );
}


