# snap-a-miro

Convert whiteboard photos into interactive Miro boards using AI vision analysis.

Perfect for teams who do a lot of in-person whiteboarding and want to quickly digitize their diagrams.

## Features

- Drag-and-drop photo upload
- AI-powered diagram analysis (detects shapes, text, arrows, sticky notes)
- Automatic Miro board creation with all detected elements
- Support for flowcharts, mind maps, and general diagrams
- Preview mode to see what will be extracted before creating the board

## Quick Start

### 1. Clone and Install

```bash
cd snap-a-miro
npm install
```

### 2. Set Up API Keys

Copy the example environment file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your API keys (see setup guides below).

### 3. Run the Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Setup Guides

### Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key and add it to your `.env` file:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### Miro Developer Setup

1. **Create a Miro Account** (if you don't have one)
   - Go to [miro.com](https://miro.com) and sign up

2. **Access Developer Settings**
   - Go to [miro.com/app/settings/user-profile/apps](https://miro.com/app/settings/user-profile/apps)
   - Or: Click your profile picture → Settings → Your apps

3. **Create a New App**
   - Click **Create new app**
   - App name: `snap-a-miro`
   - Team: Select your team
   - Click **Create app**

4. **Configure Permissions**
   - In your app settings, scroll to **Permissions**
   - Enable these scopes:
     - `boards:write` - Create and modify boards
     - `boards:read` - Read board data

5. **Get Your Access Token**
   - Scroll to **Access Token** section
   - Click **Copy** to copy your token
   - Add it to your `.env` file:
     ```
     MIRO_ACCESS_TOKEN=your-token-here
     ```

6. **(Optional) Get Your Team ID**
   - If you want boards created in a specific team
   - Go to your Miro team dashboard
   - The Team ID is in the URL: `miro.com/app/dashboard/?team=TEAM_ID`
   - Add it to your `.env`:
     ```
     MIRO_TEAM_ID=your-team-id
     ```

## Usage

1. **Upload a Photo**
   - Drag and drop a whiteboard photo onto the upload zone
   - Or click to browse and select a file
   - Supports JPEG, PNG, WebP (max 10MB)

2. **Preview (Optional)**
   - Click "Analyze Only" to see what elements were detected
   - Shows counts of shapes, connectors, text blocks, and sticky notes

3. **Convert to Miro**
   - Click "Convert to Miro" to create the board
   - Wait for processing (usually 10-30 seconds)
   - Click "Open in Miro" to view your new board

## Tips for Best Results

- **Good lighting**: Take photos in well-lit conditions
- **Clear contrast**: Dark markers on white boards work best
- **Straight angle**: Capture the whiteboard straight-on if possible
- **Readable text**: Ensure handwriting is legible
- **Complete view**: Include the full diagram in the frame

## Project Structure

```
snap-a-miro/
├── server/
│   ├── index.js          # Express server
│   ├── routes/
│   │   └── convert.js    # API endpoints
│   ├── services/
│   │   ├── vision.js     # Claude Vision analysis
│   │   └── miro.js       # Miro API client
│   └── utils/
│       └── transform.js  # Coordinate transformation
├── public/
│   ├── index.html        # Web UI
│   ├── styles.css        # Styling
│   └── app.js            # Frontend logic
├── package.json
├── .env.example
└── README.md
```

## API Endpoints

### POST /api/convert

Converts a whiteboard image to a Miro board.

**Request**: `multipart/form-data` with `image` field

**Response**:
```json
{
  "success": true,
  "boardId": "uXjVN...",
  "boardUrl": "https://miro.com/app/board/uXjVN.../",
  "itemCount": 12,
  "title": "System Architecture"
}
```

### POST /api/preview

Analyzes an image without creating a board.

**Request**: `multipart/form-data` with `image` field

**Response**:
```json
{
  "success": true,
  "analysis": {
    "title": "System Architecture",
    "shapes": 5,
    "textBlocks": 2,
    "stickyNotes": 3,
    "connectors": 4
  }
}
```

### GET /health

Health check endpoint.

## Troubleshooting

### "MIRO_ACCESS_TOKEN is not set"
- Ensure you've copied your token to the `.env` file
- Restart the server after changing `.env`

### "Failed to create board"
- Check that your Miro token has `boards:write` permission
- Verify the token hasn't expired

### "No text/shapes detected"
- Try with a clearer, higher-resolution photo
- Ensure good lighting and contrast
- Make sure the whiteboard content is visible

## Tech Stack

- **Backend**: Node.js, Express
- **AI Vision**: Anthropic Claude (claude-3-5-sonnet)
- **Diagram Creation**: Miro REST API v2
- **Frontend**: Vanilla HTML/CSS/JavaScript

## License

MIT
