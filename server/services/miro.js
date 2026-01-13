import axios from 'axios';

const MIRO_API_BASE = 'https://api.miro.com/v2';

function getMiroClient() {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Miro access token not configured. Please set MIRO_ACCESS_TOKEN in your environment.');
  }

  return axios.create({
    baseURL: MIRO_API_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Parse Miro API errors into user-friendly messages
function parseMiroError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) {
      return 'Miro access token is invalid or expired. Please check your MIRO_ACCESS_TOKEN.';
    }
    if (status === 403) {
      return 'Miro access denied. Please ensure your token has the required permissions (boards:write).';
    }
    if (status === 429) {
      return 'Miro API rate limit exceeded. Please try again in a moment.';
    }
    if (status >= 500) {
      return 'Miro API is temporarily unavailable. Please try again later.';
    }

    return data?.message || `Miro API error (${status})`;
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return 'Unable to connect to Miro API. Please check your internet connection.';
  }

  return error.message || 'Unknown Miro API error';
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

  try {
    const response = await withRetry(() => client.post('/boards', payload));
    console.log('Created Miro board:', response.data.id);
    return response.data;
  } catch (error) {
    throw new Error(parseMiroError(error));
  }
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
