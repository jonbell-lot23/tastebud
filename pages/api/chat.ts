import type { NextRequest } from 'next/server';
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';

if (!process.env.OPENAI_API_KEY)
  console.warn(
    'OPENAI_API_KEY has not been provided in this deployment environment. ' +
      'Will use the optional keys incoming from the client, which is not recommended.'
  );

export interface ChatMessage {
  role: 'assistant' | 'system' | 'user';
  content: string;
}

interface ChatCompletionsRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
  stream: boolean;
  n: number;
}

interface ChatCompletionsResponseChunked {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    delta: Partial<ChatMessage>;
    index: number;
    finish_reason: 'stop' | 'length' | null;
  }[];
}

async function OpenAIStream(
  apiKey: string,
  payload: Omit<ChatCompletionsRequest, 'stream' | 'n'>
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const streamingPayload: ChatCompletionsRequest = {
    ...payload,
    stream: true,
    n: 1,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    method: 'POST',
    body: JSON.stringify(streamingPayload),
  });

  return new ReadableStream({
    async start(controller) {
      if (!res.ok) {
        let errorPayload: object = {};
        try {
          errorPayload = await res.json();
        } catch (e) {
          // ignore
        }
        controller.enqueue(
          encoder.encode(
            `OpenAI API error: ${res.status} ${res.statusText} ${JSON.stringify(errorPayload)}`
          )
        );
        controller.close();
        return;
      }

      let sentFirstPacket = false;

      const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
        if (event.type !== 'event') return;

        if (event.data === '[DONE]') {
          controller.close();
          return;
        }

        try {
          const json: ChatCompletionsResponseChunked = JSON.parse(event.data);

          if (json.choices[0].delta?.role) return;

          if (!sentFirstPacket) {
            sentFirstPacket = true;
            const firstPacket: ChatApiOutputStart = {
              model: json.model,
            };
            controller.enqueue(encoder.encode(JSON.stringify(firstPacket)));
          }

          const text = json.choices[0].delta?.content || '';
          const queue = encoder.encode(text);
          controller.enqueue(queue);
        } catch (e) {
          controller.error(e);
        }
      });

      for await (const chunk of res.body as any)
        parser.feed(decoder.decode(chunk));
    },
  });
}

export interface ChatApiInput {
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatApiOutputStart {
  model: string;
}

export default async function handler(req: NextRequest) {
  const {
    model,
    messages,
    temperature = 0.5,
    max_tokens = 2048,
  }: ChatApiInput = await req.json();

  const apiKey = process.env.OPENAI_API_KEY || '';

  if (!apiKey)
    return new Response(
      'Error: missing OpenAI API Key. Add it on the client side (Settings icon) or server side (your deployment).',
      { status: 400 }
    );

  const stream: ReadableStream = await OpenAIStream(apiKey, {
    model,
    messages,
    temperature,
    max_tokens,
  });

  return new Response(stream);
}

export const config = {
  runtime: 'edge',
};
