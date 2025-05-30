import OpenAI from "openai";

// The global setTimeout is already patched in server/index.ts
// Maximum safe timeout value (32-bit signed integer)
const MAX_TIMEOUT = 2147483647; // ~24.8 days

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: MAX_TIMEOUT // Set a safe maximum timeout for OpenAI API calls
});

interface TranslationRequest {
  source: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string[];
  glossaryTerms?: {
    source: string;
    target: string;
  }[];
}

interface TranslationResponse {
  target: string;
  alternatives?: string[];
}

/**
 * Translates text using OpenAI's GPT model
 */
export async function translateWithGPT(
  request: TranslationRequest
): Promise<TranslationResponse> {
  const { source, sourceLanguage, targetLanguage, context, glossaryTerms } = request;
  
  // Construct prompt with context if available
  let systemPrompt = `You are a professional translator specializing in patent documents. 
`;
  systemPrompt += `Translate the following text from ${sourceLanguage} to ${targetLanguage}. `;
  systemPrompt += `Maintain the technical accuracy and terminology. `;
  systemPrompt += `Respond with a JSON object in the following format:
{
  "translation": "your translation here",
  "alternatives": ["alternative 1", "alternative 2"]
}`;
  systemPrompt += `
The alternatives array should contain 2 slightly different translation options if appropriate.`;
  
  // Add glossary context if available
  if (glossaryTerms && glossaryTerms.length > 0) {
    systemPrompt += `\n\nYou MUST use the following terminology in your translation:\n`;
    glossaryTerms.forEach(term => {
      systemPrompt += `- When you see "${term.source}" in ${sourceLanguage}, translate it as "${term.target}" in ${targetLanguage}\n`;
    });
  }
  
  let contextPrompt = "";
  if (context && context.length > 0) {
    contextPrompt = "\n\nHere are some previous translations for reference:\n";
    contextPrompt += context.map(c => `- ${c}`).join("\n");
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: source + contextPrompt }
      ],
      temperature: 0.3, // Lower temperature for more accurate translations
      max_tokens: 2048,
      response_format: { type: "json_object" }
    });
    
    const responseContent = response.choices[0].message.content?.trim() || "";
    
    try {
      const parsedResponse = JSON.parse(responseContent);
      return {
        target: parsedResponse.translation,
        alternatives: parsedResponse.alternatives || []
      };
    } catch (parseError) {
      console.error("Error parsing GPT JSON response:", parseError);
      // Fallback to using the raw response if JSON parsing fails
      return {
        target: responseContent,
      };
    }
  } catch (error: any) {
    console.error("Error translating with GPT:", error);
    throw new Error(`Translation failed: ${error?.message || 'Unknown error'}`);
  }
}
