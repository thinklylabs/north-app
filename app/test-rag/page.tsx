'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function TestRAGPage() {
  const [content, setContent] = useState('');
  const [sourceType, setSourceType] = useState('meeting');
  const [sourceName, setSourceName] = useState('test_source');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const processContent = async () => {
    if (!content.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/process-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          source_type: sourceType,
          source_name: sourceName,
          metadata: {
            title: `${sourceType} content`,
            date: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process content');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Test RAG System</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Process Content</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="meeting">Meeting</option>
              <option value="slack">Slack</option>
              <option value="google_drive">Google Drive</option>
              <option value="email">Email</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Source Name</label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., team_meeting_2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 border rounded-lg px-3 py-2"
              placeholder="Paste your content here..."
            />
          </div>

          <button
            onClick={processContent}
            disabled={loading || !content.trim()}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Process Content'}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Results</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <h3 className="font-semibold">Success!</h3>
              <p>Content ID: {result.content_id}</p>
              <p>Sections Created: {result.sections_created}</p>
            </div>
          )}

          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Sample Content for Testing</h3>
            <div className="text-sm space-y-2">
              <p><strong>Meeting:</strong></p>
              <pre className="text-xs bg-white p-2 rounded">
{`Speaker 1: We need to discuss the new product launch timeline.
Speaker 2: I think we should aim for Q2 2024.
Speaker 1: That sounds reasonable. What about the marketing budget?
Speaker 2: We've allocated 20% more than last year.
Speaker 1: Great! Let's focus on user feedback collection.`}
              </pre>
              
              <p><strong>Slack:</strong></p>
              <pre className="text-xs bg-white p-2 rounded">
{`Hey team, just finished the user research interviews
The feedback is really positive about our new features
We should definitely prioritize the mobile app improvements
Let's schedule a follow-up meeting next week`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <a 
          href="/chat" 
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
        >
          Go to Chat Interface
        </a>
      </div>
    </div>
  );
}
