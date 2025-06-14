import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { z } from 'zod';

// Initialize dotenv to load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8081;

// Initialize ElevenLabs Client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Middleware
app.use(cors({ origin: 'http://localhost:3000' })); // Allow requests from your frontend
app.use(express.json());

// Define the schema for the request body
const ttsSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(1000, 'Text is too long'),
  voiceId: z.string().optional().default('JBFqnCBsd6RMkjVDRZzb'),
});

// Define the text-to-speech endpoint
app.post('/api/tts', async (req: Request, res: Response): Promise<any> => {
  try {
    // Validate the request body
    const validatedBody = ttsSchema.safeParse(req.body);
    if (!validatedBody.success) {
      return res.status(400).json({ error: validatedBody.error.flatten() });
    }

    const { text, voiceId } = validatedBody.data;

    console.log(`Received request for TTS with voice ${voiceId}: "${text}"`);

    // Generate audio stream from ElevenLabs
    const audioStream = await elevenlabs.textToSpeech.stream(voiceId, {
      modelId: 'eleven_multilingual_v2',
      text,
      outputFormat: 'mp3_44100_128',
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        useSpeakerBoost: true,
      },
    });

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');

    // The SDK stream is an async iterable. We must iterate over it and write each chunk manually.
    console.log('Streaming audio to client...');
    for await (const chunk of audioStream) {
      res.write(chunk);
    }
    
    // End the response when the stream is finished.
    res.end();
    console.log('Streaming finished.');

  } catch (error) {
    console.error('Error in TTS endpoint:', error);
    res.status(500).json({ error: 'Failed to generate audio stream.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});