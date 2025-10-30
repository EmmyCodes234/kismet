import { GoogleGenAI } from "@google/genai";
import { getFullTournamentDataForReport } from './apiService';

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI | null => {
    if (ai) return ai;
    if (!API_KEY) {
        console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
        return null;
    }
    ai = new GoogleGenAI({ apiKey: API_KEY });
    return ai;
}

export const generateTournamentReport = async (tournamentId: string): Promise<string> => {
  const aiClient = getAiClient();
  if (!aiClient) {
    return "Error: Gemini API key is not configured. Please set the API_KEY environment variable.";
  }

  const data = await getFullTournamentDataForReport(tournamentId);
  if (!data) {
      return "Error: Could not find tournament data to generate report.";
  }

  const model = "gemini-2.5-pro";
  
  const prompt = `
    Analyze the provided Scrabble tournament data (JSON format) and generate a final statistical report in markdown format. 
    
    The report should be insightful, professional, and easy to read for fans and players.

    Specifically, you must:
    1.  Provide a brief, high-level summary of the tournament winner and their overall performance.
    2.  Identify the most surprising result or "upset" of the tournament. Explain your reasoning based on player ratings and point spreads.
    3.  For the top-ranked player, analyze their performance by comparing their average point spread against their win/loss record. Did they win convincingly or just barely?
    4.  Highlight one other interesting statistic or observation from the data relevant to competitive Scrabble (e.g., highest scoring game, a notable comeback, a player who over-performed their rating, etc.).

    Here is the tournament data:
    ${JSON.stringify(data, null, 2)}
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `An error occurred while generating the report: ${error.message}`;
    }
    return "An unknown error occurred while generating the report.";
  }
};
