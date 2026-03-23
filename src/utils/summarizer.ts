import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export async function generateNotes(
  text: string, 
  length: 'short' | 'medium' | 'long',
  onProgress?: (text: string) => void
): Promise<string> {
  if (!text || text.trim().length === 0) return "";

  try {
    // Initialize Gemini API strictly using process.env.GEMINI_API_KEY as required
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    let lengthInstruction = "Keep it concise and brief, focusing only on the most critical points.";
    if (length === 'medium') lengthInstruction = "Provide a balanced summary with key details and important context.";
    if (length === 'long') lengthInstruction = "Provide a comprehensive and detailed summary, capturing all nuances and important data points.";

    const prompt = `
You are an expert, professional note-taker and document analyst. I will provide you with raw text extracted from a document.
Your task is to generate highly organized, beautifully designed, and structured notes using Markdown.

**CRITICAL: YOUR OUTPUT MUST BE PURE MARKDOWN ONLY. DO NOT INCLUDE ANY INTRODUCTORY TEXT, CONVERSATIONAL FILLER, OR "HERE ARE YOUR NOTES".**

Guidelines for Premium Document Design:
1. **Title**: Start with a clear H1 (#) title. Example: "# Financial Report 2024"
2. **TL;DR**: Right below the title, provide a 1-2 sentence TL;DR inside a blockquote (>).
3. **Hierarchy**: 
   - Use H2 (##) for major sections.
   - Use H3 (###) for sub-sections.
   - ALWAYS put a space after the # symbols (e.g., "## Section" NOT "##Section").
   - Add a relevant emoji to every heading.
4. **Data Visualization (Tables)**: 
   - **MANDATORY**: If the document contains any numerical data, comparisons, or lists with multiple attributes, you **MUST** use Markdown Tables.
   - **TABLE SYNTAX**: Ensure the header row and separator row are on separate lines.
     Example:
     | Header 1 | Header 2 |
     | :--- | :--- |
     | Value 1 | Value 2 |
5. **Structure & Spacing**:
   - Use \`## Section Title\` for major topics (these become cinematic sections).
   - Use \`### Card Title\` for specific sub-topics (these become animated cards).
   - Use \`**Term**: Definition\` for key concepts (these become definition boxes).
   - Use \`> Important Note\` for callouts (these become info boxes).
   - **MANDATORY**: Use DOUBLE NEWLINES (\\n\\n) between every block element.
   - Use horizontal rules (---) between major sections.
   - Use bullet points (-) for lists.
6. **Highlights**: Use blockquotes (>) for critical takeaways or "Pro-Tips".
7. ${lengthInstruction}
8. Fix obvious OCR typos.

Text to analyze:
"""
${text.substring(0, 60000)}
"""
    `;

    if (onProgress) {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          onProgress(fullText);
        }
      }
      return fullText;
    } else {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("Empty response from Gemini.");
      }

      return response.text;
    }
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    // Fallback to basic extraction if API fails
    const fallbackText = generateBasicNotes(text, length, error.message || "Unknown error");
    
    if (onProgress) {
      let currentText = "";
      const words = fallbackText.split(" ");
      for (const word of words) {
        currentText += word + " ";
        onProgress(currentText);
        await new Promise(r => setTimeout(r, 30)); // Simulate typing delay
      }
    }
    
    return fallbackText;
  }
}

// Fallback function in case API fails
function generateBasicNotes(text: string, length: 'short' | 'medium' | 'long', errorMsg: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length <= 5) return lines.map(l => `- ${l}`).join('\n');

  const isHeading = (line: string) => (line.length < 50 && line === line.toUpperCase() && line.match(/[A-Z]/)) || (line.length < 60 && line.endsWith(':'));

  const finalLines: string[] = [];
  let count = 0;
  const maxLines = length === 'short' ? 10 : length === 'medium' ? 20 : 40;

  for (const line of lines) {
    if (count >= maxLines) break;
    if (isHeading(line)) {
      finalLines.push(`\n### ${line.replace(/:$/, '')}\n`);
    } else {
      if (line.includes(':') && line.split(':')[0].length < 30) {
        const parts = line.split(':');
        finalLines.push(`- **${parts[0].trim()}**: ${parts.slice(1).join(':').trim()}`);
      } else {
        finalLines.push(`- ${line}`);
      }
      count++;
    }
  }
  return finalLines.join('\n').trim() + `\n\n> ⚠️ **Note:** Generated using offline fallback because the AI model failed to load. (Error: ${errorMsg})`;
}
