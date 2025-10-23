# YouTube Transcript Viewer

A modern web application built with React, TypeScript, and Express that extracts and displays transcripts from YouTube videos.

## Features

- Extract transcripts from any YouTube video
- Clean, modern UI with gradient styling
- Timestamps for each transcript segment
- Copy entire transcript to clipboard
- Real-time loading states and error handling
- Responsive design

## Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- Modern CSS with gradient effects

**Backend:**
- Express.js
- youtube-transcript library
- CORS enabled

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Navigate to the project directory:
```bash
cd youtube-transcript-app
```

2. Install dependencies (already done):
```bash
npm install
```

## Running the Application

You need to run both the backend server and the frontend development server.

### Terminal 1 - Backend Server
```bash
npm run server
```
This starts the Express server on `http://localhost:3001`

### Terminal 2 - Frontend Dev Server
```bash
npm run dev
```
This starts the Vite dev server (typically on `http://localhost:5173`)

## Usage

1. Open your browser and navigate to the frontend URL (shown in Terminal 2)
2. Enter a YouTube video URL or video ID in the input field
3. Click "Get Transcript" or press Enter
4. View the transcript with timestamps
5. Click "Copy All" to copy the entire transcript to your clipboard

## Supported URL Formats

- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`
- Video ID only: `VIDEO_ID`

## Project Structure

```
youtube-transcript-app/
├── src/
│   ├── App.tsx           # Main React component
│   ├── App.css           # Styling
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── server.ts             # Express backend (in parent directory)
├── package.json
└── README.md
```

## API Endpoints

### GET /api/transcript

Fetches the transcript for a YouTube video.

**Query Parameters:**
- `url` (required): YouTube video URL or ID

**Response:**
```json
{
  "success": true,
  "transcript": [
    {
      "text": "Transcript text",
      "duration": 2.5,
      "offset": 1000
    }
  ],
  "videoId": "VIDEO_ID"
}
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

**"Failed to connect to server" error:**
- Make sure the backend server is running on port 3001
- Check if there are any CORS issues in the browser console

**"No transcript available" error:**
- Some videos don't have transcripts available
- Make sure the video URL is correct
- Try with a different video that you know has captions

## License

MIT
