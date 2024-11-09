export interface ErrorItem {
  // Original format
  "خطأ"?: string;
  // Alternative format
  "الكلمة_الخاطئة"?: string;
  "الكلمة الخاطئة"?: string;
  // Common fields that can use either space or underscore
  "نوع الخطأ"?: string;
  "نوع_الخطأ"?: string;
  "تصحيح الكلمة"?: string;
  "تصحيح_الكلمة"?: string;
}

export type WatsonResponse = ErrorItem[];

interface WatsonGeneratedText {
  results: Array<{
    generated_text: string;
  }>;
}

export class IBMWatsonAPI {
  async generateText(prompt: string): Promise<WatsonResponse> {
    const response = await fetch('/api/watson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate text');
    }

    const data = await response.json();
    const text = data.results[0].generated_text;
    
    // Convert the text to proper JSON array format
    const formattedText = `[${text.replace(/}\s*,\s*{/g, '}, {')}]`;
    return JSON.parse(formattedText);
  }

  async generateSynonyms(text: string): Promise<WatsonGeneratedText> {
    const response = await fetch('/api/watson/synonyms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: process.env.NEXT_PUBLIC_PARA_PROMPT + text 
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate synonyms');
    }

    return response.json();
  }
}

export const watsonApi = new IBMWatsonAPI();

// Export environment variables
export const PARA_PROMPT = process.env.NEXT_PUBLIC_PARA_PROMPT || 'أعد صياغة الجملة التالية بخمس طرق غير متشابهة واجعل كل جملة في سطر جديد :';
