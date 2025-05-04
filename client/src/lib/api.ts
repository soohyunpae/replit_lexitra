import { apiRequest } from "@/lib/queryClient";
import { type TranslationUnit, type TranslationMemory, type Glossary } from "@/types";

// API functions for working with translations

// Translate a segment with GPT, considering TM context and glossary terms
export async function translateWithGPT(
  source: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ 
  target: string; 
  tmMatches: TranslationMemory[]; 
  glossaryTerms?: Glossary[];
  error?: string;
 }> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/translate",
      {
        source,
        sourceLanguage,
        targetLanguage
      }
    );
    
    return await response.json();
  } catch (error) {
    console.error("Error translating with GPT:", error);
    throw error;
  }
}

// Search translation memory for matches
export async function searchTranslationMemory(
  source: string,
  sourceLanguage: string,
  targetLanguage: string,
  limit = 5
): Promise<TranslationMemory[]> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/search_tm",
      {
        source,
        sourceLanguage,
        targetLanguage,
        limit
      }
    );
    
    return await response.json();
  } catch (error) {
    console.error("Error searching TM:", error);
    throw error;
  }
}

// Update a translation segment
export async function updateSegment(
  id: number,
  target: string,
  status: string
): Promise<TranslationUnit> {
  try {
    const response = await apiRequest(
      "PATCH",
      `/api/segments/${id}`,
      { target, status }
    );
    
    return await response.json();
  } catch (error) {
    console.error("Error updating segment:", error);
    throw error;
  }
}

// Save to translation memory
export async function saveToTM(
  source: string,
  target: string,
  status: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: string
): Promise<TranslationMemory> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/update_tm",
      {
        source,
        target,
        status,
        sourceLanguage,
        targetLanguage,
        context
      }
    );
    
    return await response.json();
  } catch (error) {
    console.error("Error saving to TM:", error);
    throw error;
  }
}

// Get glossary terms
export async function getGlossaryTerms(
  sourceLanguage: string,
  targetLanguage: string
): Promise<Glossary[]> {
  try {
    const response = await apiRequest(
      "GET",
      `/api/glossary?sourceLanguage=${sourceLanguage}&targetLanguage=${targetLanguage}`,
    );
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching glossary terms:", error);
    throw error;
  }
}
