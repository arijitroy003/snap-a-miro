import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization to ensure dotenv has loaded
let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
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

  console.log('Sending image to Claude Vision for analysis...');
  if (glossary) {
    console.log('Using glossary terms:', glossary.substring(0, 100) + '...');
  }
  if (aiPrompt) {
    console.log('AI customization:', aiPrompt.substring(0, 50) + '...');
  }

  const prompt = buildPrompt(glossary, aiPrompt);

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent) {
    throw new Error('No text response from Claude Vision');
  }

  const jsonText = textContent.text.trim();

  // Parse the JSON response
  try {
    const parsed = JSON.parse(jsonText);
    console.log('Vision analysis complete:', {
      shapes: parsed.shapes?.length || 0,
      connectors: parsed.connectors?.length || 0,
      textBlocks: parsed.textBlocks?.length || 0,
      stickyNotes: parsed.stickyNotes?.length || 0,
    });
    return parsed;
  } catch (parseError) {
    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse vision response: ${parseError.message}`);
  }
}
