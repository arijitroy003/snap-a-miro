// Transform vision output coordinates to Miro coordinate system
// Vision uses 0-100 percentage, Miro uses pixels with center origin

// Miro board dimensions (we'll use a reasonable default canvas size)
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1500;

// Base size multipliers
const WIDTH_MULTIPLIER = 20;
const HEIGHT_MULTIPLIER = 15;

// Color themes for Miro shapes
const THEMES = {
  default: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
    background: '#ffffff',
    border: '#1a1a1a',
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#0284c7',
    background: '#e0f2fe',
    border: '#0369a1',
  },
  forest: {
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#15803d',
    background: '#dcfce7',
    border: '#166534',
  },
  sunset: {
    primary: '#f97316',
    secondary: '#eab308',
    accent: '#ea580c',
    background: '#fef3c7',
    border: '#c2410c',
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#a855f7',
    accent: '#7c3aed',
    background: '#f3e8ff',
    border: '#6b21a8',
  },
};

// Get theme colors
function getTheme(themeName) {
  return THEMES[themeName] || THEMES.default;
}

// Color palette for shapes (fallback for color hints)
const COLOR_PALETTE = {
  red: '#ff6b6b',
  blue: '#4ecdc4',
  green: '#95e1d3',
  yellow: '#f9ed69',
  orange: '#f38181',
  purple: '#a8d8ea',
  pink: '#ffb6b9',
  gray: '#c4c4c4',
  default: '#ffffff',
};

export function transformVisionToMiro(visionData, themeName = 'default') {
  const theme = getTheme(themeName);

  const result = {
    shapes: [],
    textBlocks: [],
    stickyNotes: [],
    connectorMappings: [],
    title: visionData.title || 'Whiteboard Import',
  };

  // Map to track vision IDs to Miro item IDs (filled after creation)
  const idMap = new Map();

  // Transform shapes with theme colors
  if (visionData.shapes && Array.isArray(visionData.shapes)) {
    result.shapes = visionData.shapes.map((shape, index) => {
      // Cycle through theme colors for shapes
      const colorOptions = [theme.primary, theme.secondary, theme.accent];
      const themeColor = colorOptions[index % colorOptions.length];

      const transformed = {
        visionId: shape.id,
        type: shape.type || 'rectangle',
        text: shape.text || '',
        x: percentToPixel(shape.x, CANVAS_WIDTH),
        y: percentToPixel(shape.y, CANVAS_HEIGHT),
        width: (shape.width || 15) * WIDTH_MULTIPLIER,
        height: (shape.height || 10) * HEIGHT_MULTIPLIER,
        fillColor: shape.color ? getColor(shape.color) : themeColor,
        borderColor: theme.border,
      };
      return transformed;
    });
  }

  // Transform text blocks
  if (visionData.textBlocks && Array.isArray(visionData.textBlocks)) {
    result.textBlocks = visionData.textBlocks.map((text) => ({
      visionId: text.id,
      content: text.content || '',
      x: percentToPixel(text.x, CANVAS_WIDTH),
      y: percentToPixel(text.y, CANVAS_HEIGHT),
      fontSize: text.fontSize || 'medium',
    }));
  }

  // Transform sticky notes
  if (visionData.stickyNotes && Array.isArray(visionData.stickyNotes)) {
    result.stickyNotes = visionData.stickyNotes.map((sticky) => ({
      visionId: sticky.id,
      content: sticky.content || '',
      x: percentToPixel(sticky.x, CANVAS_WIDTH),
      y: percentToPixel(sticky.y, CANVAS_HEIGHT),
      color: sticky.color || 'yellow',
    }));
  }

  // Store connector mappings (to be resolved after items are created)
  if (visionData.connectors && Array.isArray(visionData.connectors)) {
    result.connectorMappings = visionData.connectors.map((conn) => ({
      visionId: conn.id,
      fromVisionId: conn.from,
      toVisionId: conn.to,
      label: conn.label || null,
      style: conn.style || 'arrow',
    }));
  }

  return result;
}

function percentToPixel(percent, dimension) {
  // Convert 0-100 percentage to pixel position
  // Center the canvas around origin (0,0)
  const halfDimension = dimension / 2;
  return ((percent / 100) * dimension) - halfDimension;
}

function getColor(colorHint) {
  if (!colorHint) return COLOR_PALETTE.default;

  const lowerColor = colorHint.toLowerCase();

  // Check if it's already a hex color
  if (lowerColor.startsWith('#')) {
    return colorHint;
  }

  // Map color names to hex
  return COLOR_PALETTE[lowerColor] || COLOR_PALETTE.default;
}

// Resolve connector references after items are created
export function resolveConnectors(connectorMappings, visionToMiroIdMap) {
  return connectorMappings
    .map((conn) => {
      const startId = visionToMiroIdMap.get(conn.fromVisionId);
      const endId = visionToMiroIdMap.get(conn.toVisionId);

      if (!startId || !endId) {
        console.warn(`Could not resolve connector: ${conn.fromVisionId} -> ${conn.toVisionId}`);
        return null;
      }

      return {
        startItemId: startId,
        endItemId: endId,
        label: conn.label,
        style: conn.style,
      };
    })
    .filter(Boolean);
}
