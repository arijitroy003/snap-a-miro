import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization to ensure dotenv has loaded
let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your environment.');
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

function buildPrompt(glossary, aiPrompt) {
  let prompt = `You are an expert at analyzing whiteboard photos and extracting structured diagram data.

Analyze this whiteboard image and extract all visual elements into a structured JSON format.

IMPORTANT RULES:
1. Use a coordinate system where x and y range from 0-100 (percentage of image dimensions)
2. Estimate element positions based on their visual location in the image
3. Identify connections/arrows between shapes
4. Read all text accurately, even if handwritten
5. Determine shape types based on their appearance`;

  if (glossary && glossary.trim()) {
    prompt += `

CORPORATE GLOSSARY - When reading handwritten text, prefer these known terms if the handwriting is ambiguous:
${glossary}

Use these terms exactly as written when you recognize them in the image.`;
  }

  if (aiPrompt && aiPrompt.trim()) {
    prompt += `

USER CUSTOMIZATION REQUEST:
${aiPrompt}

Apply this customization when analyzing the whiteboard and suggesting colors, layout improvements, or emphasis.`;
  }

  prompt += `

Return ONLY valid JSON with this exact structure (no markdown, no explanation):

{
  "shapes": [
    {
      "id": "shape_1",
      "type": "rectangle|circle|diamond|oval|parallelogram|hexagon",
      "text": "text inside the shape",
      "x": 0-100,
      "y": 0-100,
      "width": 5-50,
      "height": 5-30,
      "color": "suggested color based on original or null"
    }
  ],
  "connectors": [
    {
      "id": "conn_1",
      "from": "shape_id",
      "to": "shape_id",
      "label": "text on the connector or null",
      "style": "arrow|line|dashed"
    }
  ],
  "textBlocks": [
    {
      "id": "text_1",
      "content": "standalone text not in a shape",
      "x": 0-100,
      "y": 0-100,
      "fontSize": "small|medium|large"
    }
  ],
  "stickyNotes": [
    {
      "id": "sticky_1",
      "content": "text on sticky note",
      "x": 0-100,
      "y": 0-100,
      "color": "yellow|pink|blue|green|orange"
    }
  ],
  "title": "suggested title for the diagram based on content"
}

Guidelines:
- Rectangles: boxes, squares with right angles
- Circles: round shapes, ellipses
- Diamonds: decision points, rotated squares
- Shapes should have unique IDs like shape_1, shape_2, etc.
- Connectors reference shape IDs in "from" and "to" fields
- If an arrow points from A to B, set from=A and to=B
- For handwritten text, do your best to interpret it
- Sticky notes are typically square, colored, and contain notes
- Text blocks are standalone text not inside any shape

Return ONLY the JSON object, nothing else.`;

  return prompt;
}

export async function analyzeWhiteboard(imageBuffer, mimeType, glossary, aiPrompt) {
  const base64Image = imageBuffer.toString('base64');
  const mediaType = mimeType || 'image/jpeg';

  console.log('Sending image to Gemini Vision for analysis...');
  if (glossary) {
    console.log('Using glossary terms:', glossary.substring(0, 100) + '...');
  }
  if (aiPrompt) {
    console.log('AI customization:', aiPrompt.substring(0, 50) + '...');
  }

  const prompt = buildPrompt(glossary, aiPrompt);
  const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mediaType,
    },
  };

  let result;
  try {
    result = await model.generateContent([prompt, imagePart]);
  } catch (error) {
    const errorMessage = error.message || '';
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
      throw new Error('Gemini API key is invalid or expired. Please check your GEMINI_API_KEY.');
    }
    if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('429')) {
      throw new Error('Gemini API rate limit exceeded. Please try again in a moment.');
    }
    if (errorMessage.includes('503') || errorMessage.includes('unavailable')) {
      throw new Error('Gemini API is temporarily unavailable. Please try again later.');
    }
    throw new Error(`Gemini API error: ${errorMessage || 'Unknown error'}`);
  }

  const response = await result.response;
  const text = response.text().trim();

  // Parse the JSON response
  try {
    const parsed = JSON.parse(text);
    console.log('Gemini Vision analysis complete:', {
      shapes: parsed.shapes?.length || 0,
      connectors: parsed.connectors?.length || 0,
      textBlocks: parsed.textBlocks?.length || 0,
      stickyNotes: parsed.stickyNotes?.length || 0,
    });
    return parsed;
  } catch (parseError) {
    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse Gemini vision response: ${parseError.message}`);
  }
}
