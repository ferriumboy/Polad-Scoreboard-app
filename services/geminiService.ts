import { GoogleGenAI } from "@google/genai";
import { StandingsRow } from "../types";

const SYSTEM_INSTRUCTION = `Sən təcrübəli futbol analitikisən. Sənə futbol turnir cədvəli veriləcək. 
Bu cədvələ əsasən qısa, maraqlı və peşəkar şərh ver. 
Kim liderdir, kimin şansı çoxdur, kim sürpriz edə bilər? 
Cavabı Azərbaycan dilində, 'Polad AI' üslubunda ver. Maksimum 3 cümlə.`;

export const analyzeStandings = async (standings: StandingsRow[]) => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing for Gemini Analysis");
    return "API açarı tapılmadı. Zəhmət olmasa konfiqurasiyanı yoxlayın.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Format standings for the prompt
  const tableString = standings.map(row => 
    `${row.teamName}: ${row.points} xal, ${row.played} oyun (Q:${row.won}, H:${row.drawn}, M:${row.lost})`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Turnir Cədvəli:\n${tableString}\n\nBu cədvəli analiz et.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster response
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analiz zamanı xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.";
  }
};