import axios from 'axios';

const MIRO_API_BASE = 'https://api.miro.com/v2';

function getMiroClient() {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MIRO_ACCESS_TOKEN is not set in environment variables');
  }

  return axios.create({
    baseURL: MIRO_API_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Retry helper for rate limiting
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '2', 10);
        console.log(`Rate limited, waiting ${retryAfter}s before retry...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
      } else {
        throw error;
      }
    }
  }
}

export async function createBoard(name, description = '') {
  const client = getMiroClient();

  const payload = {
    name,
    description,
  };

  // Add team ID if provided
  if (process.env.MIRO_TEAM_ID) {
    payload.teamId = process.env.MIRO_TEAM_ID;
  }

  const response = await withRetry(() => client.post('/boards', payload));
  console.log('Created Miro board:', response.data.id);
  return response.data;
}

export async function createShape(boardId, shape) {
  const client = getMiroClient();

  // Map shape types to Miro shape types
  const shapeTypeMap = {
    rectangle: 'rectangle',
    circle: 'circle',
    diamond: 'rhombus',
    oval: 'oval',
    parallelogram: 'parallelogram',
    hexagon: 'hexagon',
    square: 'rectangle',
  };

  const payload = {
    data: {
      content: shape.text || '',
      shape: shapeTypeMap[shape.type] || 'rectangle',
    },
    style: {
      fillColor: shape.fillColor || '#ffffff',
      borderColor: shape.borderColor || '#1a1a1a',
      borderWidth: '2',
      textAlign: 'center',
      textAlignVertical: 'middle',
    },
    position: {
      x: shape.x,
      y: shape.y,
      origin: 'center',
    },
    geometry: {
      width: shape.width || 200,
      height: shape.height || 100,
    },
  };

  const response = await withRetry(() => client.post(`/boards/${boardId}/shapes`, payload));
  return response.data;
}

export async function createText(boardId, textBlock) {
  const client = getMiroClient();

  // Map font size
  const fontSizeMap = {
    small: 14,
    medium: 24,
    large: 36,
  };

  const payload = {
    data: {
      content: textBlock.content,
    },
    style: {
      color: '#1a1a1a',
      fontSize: String(fontSizeMap[textBlock.fontSize] || 24),
    },
    position: {
      x: textBlock.x,
      y: textBlock.y,
      origin: 'center',
    },
  };

  const response = await withRetry(() => client.post(`/boards/${boardId}/texts`, payload));
  return response.data;
}

export async function createStickyNote(boardId, sticky) {
  const client = getMiroClient();

  // Map colors to Miro sticky note colors
  const colorMap = {
    yellow: 'yellow',
    pink: 'pink',
    blue: 'light_blue',
    green: 'light_green',
    orange: 'orange',
  };

  const payload = {
    data: {
      content: sticky.content,
      shape: 'square',
    },
    style: {
      fillColor: colorMap[sticky.color] || 'yellow',
    },
    position: {
      x: sticky.x,
      y: sticky.y,
      origin: 'center',
    },
  };

  const response = await withRetry(() => client.post(`/boards/${boardId}/sticky_notes`, payload));
  return response.data;
}

export async function createConnector(boardId, startItemId, endItemId, label = null, style = 'arrow') {
  const client = getMiroClient();

  const payload = {
    startItem: {
      id: startItemId,
      snapTo: 'auto',
    },
    endItem: {
      id: endItemId,
      snapTo: 'auto',
    },
    shape: style === 'dashed' ? 'elbowed' : 'straight',
    style: {
      strokeColor: '#1a1a1a',
      strokeWidth: '2',
      strokeStyle: style === 'dashed' ? 'dashed' : 'normal',
      startStrokeCap: 'none',
      endStrokeCap: style === 'arrow' ? 'arrow' : 'none',
    },
  };

  // Add caption/label if provided
  if (label) {
    payload.captions = [
      {
        content: label,
        position: '50%',
      },
    ];
  }

  const response = await withRetry(() => client.post(`/boards/${boardId}/connectors`, payload));
  return response.data;
}
