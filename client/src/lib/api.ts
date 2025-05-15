import { apiRequest } from "@/lib/queryClient";
import { type TranslationUnit, type TranslationMemory, type Glossary } from "@/types";

// Helper function to download a file with authentication
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    // 디버깅 메시지
    console.log(`파일 다운로드 시작: ${url}, 파일명: ${filename}`);

    const token = localStorage.getItem('authToken');
    console.log(`인증 토큰 ${token ? '존재함' : '존재하지 않음'}`);

    // 브라우저의 기본 다운로드 방식 사용
    const downloadWindow = window.open(url, '_blank');

    // 새 창이 차단되었는지 확인
    if (!downloadWindow || downloadWindow.closed || typeof downloadWindow.closed === 'undefined') {
      // 새 창이 차단되었거나 열리지 않았다면, fetch 사용
      console.log('새 창이 차단되었거나 열리지 않음, fetch 방식으로 대체');

      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`파일 blob 생성 성공: ${blob.size} bytes, type: ${blob.type}`);

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || 'download';
      a.style.display = 'none';
      document.body.appendChild(a);

      console.log('다운로드 링크 생성 및 클릭');
      a.click();

      // 정리
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      console.log('다운로드 링크 정리 완료');
    } else {
      console.log('새 창으로 다운로드 진행 중');
    }
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};

// API functions for segments
export async function fetchSegments(fileId: number): Promise<TranslationUnit[]> {
  try {
    const response = await apiRequest(
      "GET", 
      `/api/segments/${fileId}`
    );
    return response.json();
  } catch (error) {
    console.error("Error fetching segments:", error);
    throw error;
  }
}

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
export async function updateSegment(id: number, target: string, status: string, origin?: string) {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No auth token found');
    }

    console.log('Updating segment:', { id, target, status, origin, hasToken: !!token });

    const response = await apiRequest('PATCH', `/api/segments/${id}`, 
      { target, status, origin },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Server response error:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData.message || `Failed to update segment: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Segment updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Error updating segment:', error);
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

// Get all glossary terms for a language pair
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

// Search glossary terms with a query string
export async function searchGlossaryTerms(
  query: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<Glossary[]> {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const response = await apiRequest(
      "GET",
      `/api/glossary/search?query=${encodeURIComponent(query)}&sourceLanguage=${sourceLanguage}&targetLanguage=${targetLanguage}`,
    );

    return await response.json();
  } catch (error) {
    console.error("Error searching glossary terms:", error);
    // Return empty array instead of throwing to provide graceful degradation
    return [];
  }
}