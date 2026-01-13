import express from 'express';
import { upload } from '../middleware/upload.js';
import { analyzeWhiteboard as analyzeWithClaude } from '../services/vision.js';
import { analyzeWhiteboard as analyzeWithGemini } from '../services/gemini-vision.js';
import {
  createBoard,
  createShape,
  createText,
  createStickyNote,
  createConnector,
} from '../services/miro.js';
import { transformVisionToMiro, resolveConnectors } from '../utils/transform.js';

// Model selection helper
function getVisionAnalyzer(model) {
  switch (model) {
    case 'gemini':
      return analyzeWithGemini;
    case 'claude':
    default:
      return analyzeWithClaude;
  }
}

const router = express.Router();

router.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const selectedModel = req.body.model || 'gemini';
    const glossary = req.body.glossary || '';
    const theme = req.body.theme || 'default';
    const aiPrompt = req.body.aiPrompt || '';
    console.log(`Processing image: ${req.file.originalname} (${req.file.size} bytes) with ${selectedModel}, theme: ${theme}`);
    if (aiPrompt) {
      console.log('AI personalization:', aiPrompt.substring(0, 50) + '...');
    }

    // Step 1: Analyze the whiteboard image with selected vision model
    const analyzeWhiteboard = getVisionAnalyzer(selectedModel);
    const visionResult = await analyzeWhiteboard(req.file.buffer, req.file.mimetype, glossary, aiPrompt);

    // Step 2: Transform coordinates and prepare Miro items
    const miroData = transformVisionToMiro(visionResult, theme);

    // Step 3: Create the Miro board
    const boardName = miroData.title || `Whiteboard Import - ${new Date().toLocaleDateString()}`;
    const board = await createBoard(boardName, 'Created from whiteboard photo by snap-a-miro');

    const boardId = board.id;
    const visionToMiroIdMap = new Map();
    let itemCount = 0;

    // Step 4: Create shapes
    for (const shape of miroData.shapes) {
      try {
        const created = await createShape(boardId, shape);
        visionToMiroIdMap.set(shape.visionId, created.id);
        itemCount++;
      } catch (error) {
        console.error(`Failed to create shape ${shape.visionId}:`, error.message);
      }
    }

    // Step 5: Create text blocks
    for (const text of miroData.textBlocks) {
      try {
        const created = await createText(boardId, text);
        visionToMiroIdMap.set(text.visionId, created.id);
        itemCount++;
      } catch (error) {
        console.error(`Failed to create text ${text.visionId}:`, error.message);
      }
    }

    // Step 6: Create sticky notes
    for (const sticky of miroData.stickyNotes) {
      try {
        const created = await createStickyNote(boardId, sticky);
        visionToMiroIdMap.set(sticky.visionId, created.id);
        itemCount++;
      } catch (error) {
        console.error(`Failed to create sticky note ${sticky.visionId}:`, error.message);
      }
    }

    // Step 7: Create connectors (after all items exist)
    const resolvedConnectors = resolveConnectors(miroData.connectorMappings, visionToMiroIdMap);
    for (const conn of resolvedConnectors) {
      try {
        await createConnector(boardId, conn.startItemId, conn.endItemId, conn.label, conn.style);
        itemCount++;
      } catch (error) {
        console.error(`Failed to create connector:`, error.message);
      }
    }

    console.log(`Successfully created board with ${itemCount} items`);

    res.json({
      success: true,
      boardId: board.id,
      boardUrl: board.viewLink,
      itemCount,
      title: boardName,
    });
  } catch (error) {
    console.error('Conversion failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to convert whiteboard to Miro board',
    });
  }
});

// Preview endpoint - just analyze without creating board
router.post('/preview', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const selectedModel = req.body.model || 'gemini';
    const glossary = req.body.glossary || '';
    const theme = req.body.theme || 'default';
    const aiPrompt = req.body.aiPrompt || '';
    console.log(`Preview analysis with ${selectedModel}`);

    const analyzeWhiteboard = getVisionAnalyzer(selectedModel);
    const visionResult = await analyzeWhiteboard(req.file.buffer, req.file.mimetype, glossary, aiPrompt);
    const miroData = transformVisionToMiro(visionResult, theme);

    res.json({
      success: true,
      analysis: {
        title: miroData.title,
        shapes: miroData.shapes.length,
        textBlocks: miroData.textBlocks.length,
        stickyNotes: miroData.stickyNotes.length,
        connectors: miroData.connectorMappings.length,
      },
      raw: visionResult,
    });
  } catch (error) {
    console.error('Preview failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze whiteboard image',
    });
  }
});

export default router;
