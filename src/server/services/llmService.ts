import dotenv from 'dotenv';
dotenv.config();

interface LLMConfig {
  provider: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

function getConfig(): LLMConfig {
  const provider = process.env.LLM_PROVIDER || 'lmstudio';

  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      };
    case 'gemini':
      return {
        provider: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-pro',
      };
    case 'lmstudio':
    default:
      return {
        provider: 'lmstudio',
        baseUrl: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
        model: process.env.LMSTUDIO_MODEL || 'local-model',
      };
  }
}

export async function generateTitleAndTags(content: string): Promise<{
  title: string;
  tags: string[];
  summary?: string;
}> {
  const config = getConfig();

  const prompt = `请根据以下内容生成一个简短的标题（不超过20个字）和3-5个相关标签。
  
内容：
${content}

请严格按照以下JSON格式返回：
{
  "title": "生成的标题",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一句话摘要（可选）"
}`;

  try {
    if (config.provider === 'gemini') {
      return await callGemini(config, prompt);
    } else {
      // OpenAI compatible (including LMStudio)
      return await callOpenAICompatible(config, prompt);
    }
  } catch (error) {
    console.error('LLM call failed:', error);
    // Fallback: generate simple title and tags
    return {
      title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
      tags: ['未分类'],
    };
  }
}

export async function summarizeImage(base64Image: string, mimeType: string): Promise<string> {
  const config = getConfig();

  const prompt = '请描述这张图片的内容，生成一段详细的文字描述，以便作为记忆记录保存。';

  try {
    if (config.provider === 'gemini') {
      return await callGeminiVision(config, prompt, base64Image, mimeType);
    } else {
      return await callOpenAIVision(config, prompt, base64Image, mimeType);
    }
  } catch (error) {
    console.error('Vision API call failed:', error);
    return '图片内容识别失败，请手动添加描述。';
  }
}

export async function compressMemories(memories: { title: string; content: string; createdAt: Date }[]): Promise<string> {
  const config = getConfig();

  const memoriesText = memories
    .map((m, i) => `[${i + 1}] ${m.title}\n${m.content}\n时间：${m.createdAt.toLocaleDateString('zh-CN')}`)
    .join('\n\n---\n\n');

  const prompt = `请对以下${memories.length}条记忆进行总结压缩，生成一段精炼的回顾摘要。保留关键信息、重要事件和情感要点。

记忆内容：
${memoriesText}

请生成一段200-500字的摘要：`;

  try {
    if (config.provider === 'gemini') {
      const result = await callGemini(config, prompt);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } else {
      const response = await callOpenAICompatible(config, prompt, true);
      return typeof response === 'string' ? response : JSON.stringify(response);
    }
  } catch (error) {
    console.error('Compression failed:', error);
    return `本周期共有${memories.length}条记忆，AI摘要生成失败。`;
  }
}

async function callOpenAICompatible(
  config: LLMConfig,
  prompt: string,
  rawText: boolean = false
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个智能记忆助手，帮助用户整理和总结他们的碎片化记忆。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json() as any;
  const content = data.choices[0]?.message?.content || '';

  if (rawText) {
    return content;
  }

  // Try to parse JSON
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Return as-is if not JSON
  }

  return {
    title: content.slice(0, 20),
    tags: ['未分类'],
  };
}

async function callOpenAIVision(
  config: LLMConfig,
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model.includes('vision') ? config.model : 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.choices[0]?.message?.content || '无法识别图片内容';
}

async function callGemini(config: LLMConfig, prompt: string): Promise<any> {
  const response = await fetch(
    `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json() as any;
  const content = data.candidates[0]?.content?.parts[0]?.text || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Return as-is
  }

  return content;
}

async function callGeminiVision(
  config: LLMConfig,
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  const model = 'gemini-pro-vision';

  const response = await fetch(
    `${config.baseUrl}/models/${model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini Vision API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.candidates[0]?.content?.parts[0]?.text || '无法识别图片内容';
}

export function getLLMStatus(): { provider: string; available: boolean } {
  const config = getConfig();
  return {
    provider: config.provider,
    available: true, // TODO: Add actual health check
  };
}
