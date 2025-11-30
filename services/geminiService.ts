import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_TEXT, MODEL_IMAGE, MODEL_VIDEO, MODEL_TTS, DEFAULT_ASPECT_RATIO_VIDEO, DEFAULT_ASPECT_RATIO_IMAGE, DEFAULT_VIDEO_RESOLUTION, DEFAULT_THUMBNAIL_STYLE } from '../constants';

// Helper to get client with current key
const getClient = () => {
  // @ts-ignore - process.env.API_KEY is injected by the environment/aistudio wrapper
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing. Please connect wallet.");
  return new GoogleGenAI({ apiKey });
};

export const generateScript = async (topic: string): Promise<string> => {
  const ai = getClient();
  const prompt = `Bạn là một chuyên gia review bất động sản cao cấp hàng đầu.
  Hãy viết một kịch bản video ngắn (khoảng 30 giây) để giới thiệu bất động sản sau: "${topic}".
  
  Yêu cầu:
  - Ngôn ngữ: Tiếng Việt.
  - Văn phong: Chuyên nghiệp, lôi cuốn, nhấn mạnh vào tiềm năng đầu tư và không gian sống.
  - Định dạng: Chỉ viết lời thoại (voiceover) cho người đọc, không cần chỉ dẫn cảnh.
  - Bắt đầu bằng một câu hook mạnh mẽ gây tò mò.`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
    config: {
      systemInstruction: "Bạn là một nhà môi giới bất động sản tài ba. Hãy viết ngắn gọn, xúc tích.",
      temperature: 0.7,
    }
  });

  return response.text || "Không thể tạo kịch bản.";
};

export const generateThumbnail = async (topic: string, style: string = DEFAULT_THUMBNAIL_STYLE): Promise<string> => {
  const ai = getClient();
  // Using gemini-2.5-flash-image for generation via generateContent
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: {
      parts: [{ text: `Professional architectural photography of ${topic}. Style: ${style}. Wide angle lens, golden hour lighting, luxury real estate listing style, high end interior design or modern exterior, 8k resolution, photorealistic.` }]
    },
    config: {
      imageConfig: {
        aspectRatio: DEFAULT_ASPECT_RATIO_IMAGE,
      }
    }
  });

  // Extract image
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned.");
};

export const generateVoiceover = async (text: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL_TTS,
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // Gentle, professional female voice suitable for real estate
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  return `data:audio/wav;base64,${base64Audio}`; // Assuming wav/pcm container handling in frontend
};

export const generateVeoVideo = async (topic: string, resolution: string = DEFAULT_VIDEO_RESOLUTION): Promise<string> => {
  const ai = getClient();
  
  // Note: VEO requires specific prompting for best results
  // We explicitly add keywords for camera movement and lighting relevant to real estate
  let operation = await ai.models.generateVideos({
    model: MODEL_VIDEO,
    prompt: `Cinematic architectural tour of ${topic}. Smooth gimbal movement, walking through the property, bright natural lighting, luxury interior design, 4k resolution, slow pan showing details.`,
    config: {
      numberOfVideos: 1,
      resolution: resolution as any,
      aspectRatio: DEFAULT_ASPECT_RATIO_VIDEO as any,
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed.");

  // Append API key for client-side fetch (required for Veo URIs)
  // @ts-ignore
  return `${videoUri}&key=${process.env.API_KEY}`;
};