'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Old_Standard_TT } from "next/font/google";
import { Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  contextUsed?: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const { response: aiResponse, context_used } = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
        contextUsed: context_used
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Users  {'>'}  Chat</span>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-24">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px] text-center`}>Retrieval-Augmented Generation Chat Interface</h1>
        
        <div className="mt-3 text-center">
          <p className="text-[12px] leading-[1.3em] text-[#6F7777]">
            Ask questions about your knowledge base
          </p>
        </div>

        <div className="mt-8 max-w-4xl mx-auto">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-30">
                <p className="text-[12px]">Start a conversation by asking a question!</p>
                <p className="text-[10px] mt-2">Try: "What did we discuss in the last meeting?"</p>
              </div>
            )}

            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-[#1DC6A1] text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.contextUsed && (
                    <p className="text-xs opacity-75 mt-1">
                      Used {message.contextUsed} context sources
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1DC6A1]" />
                  <p>Thinking...</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 rounded">
              {error}
            </div>
          )}

          <div className="border-t p-4 bg-[#FCF9F5]">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your knowledge base..."
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DC6A1]"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-[#1DC6A1] text-white px-6 py-2 rounded-lg hover:bg-[#1DC6A1]/90 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
