'use client';

import { useState, useRef } from 'react';

export default function HomePage() {
  const [text, setText] = useState<string>('Hello, world! This is a test of streaming audio from ElevenLabs.');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    try {
      const response = await fetch('http://localhost:8081/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to get audio stream.');
      }

      const reader = response.body.getReader();
      const mimeType = 'audio/mpeg';
      let chunks: BlobPart[] = [];

      // Read the stream
      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          chunks.push(value);
        }

        // When the stream is finished, create a blob and play it
        const blob = new Blob(chunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
        setIsLoading(false);
      };

      readStream();

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
        <h1 className="text-4xl font-bold text-center text-cyan-400">
          ElevenLabs Audio Streaming
        </h1>
        <p className="text-center text-gray-400">
          Enter text below and click the button to generate and stream spoken audio from the API.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 p-4 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
            placeholder="Type anything..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            {isLoading ? 'Generating Audio...' : 'Generate and Play'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-center">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        <audio ref={audioRef} className="w-full mt-4" controls hidden />
      </div>
       <footer className="mt-8 text-center text-gray-500">
        <p>Powered by Next.js and ElevenLabs</p>
      </footer>
    </main>
  );
}