
import { GoogleGenAI } from "@google/genai";
import { Item, Log, TransactionType } from "../types";

// Always initialize the SDK using the process.env.API_KEY property
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeInventory = async (items: Item[], logs: Log[]): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  // Prepare data for the prompt
  const inventorySummary = items.map(i => 
    `- ${i.name} (${i.category}): 현재 ${i.quantity}개 (안전재고: ${i.safetyStock}, 단가: ${i.price}원)`
  ).join('\n');

  const recentLogs = logs.slice(0, 10).map(l => 
    `- ${l.timestamp.split('T')[0]}: ${l.type === TransactionType.IN ? '입고' : '출고'} ${l.itemName} ${l.quantity}개 (${l.note || '내용 없음'})`
  ).join('\n');

  const prompt = `
    당신은 전문 재고 관리 및 물류 컨설턴트 AI입니다. 
    다음은 현재 창고의 재고 현황과 최근 입출고 기록입니다.
    
    데이터를 분석하여 다음 내용을 포함한 마크다운 형식의 보고서를 작성해주세요:
    1. **재고 현황 요약**: 전체적인 재고 건전성 평가.
    2. **긴급 조치 필요**: 안전 재고 미만인 물품 식별 및 발주 제안.
    3. **트렌드 및 인사이트**: 최근 입출고 패턴을 기반으로 한 간단한 분석.
    4. **효율화 제안**: 재고 회전율이나 관리 측면에서의 조언.

    ---
    [현재 재고 목록]
    ${inventorySummary}

    [최근 활동 기록 (최근 10건)]
    ${recentLogs}
    ---
    
    한국어로 정중하고 전문적인 어조로 작성해주세요.
  `;

  try {
    // Generate content using the model name directly in the parameters
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster response on flash model
      }
    });

    // Directly access the text property of the response object
    return response.text || "분석 결과를 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
};
