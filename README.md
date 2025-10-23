# YouTube Transcript Viewer

A modern, professional web application built with React, TypeScript, and Express that extracts and displays transcripts from YouTube videos with AI-powered fact-checking capabilities.

## Features

- **Transcript Extraction**: Extract transcripts from any YouTube video with captions
- **AI Fact-Checking**: Powered by OpenRouter AI to correct transcription errors and improve accuracy
- **Modern UI**: Clean, responsive design with gradient styling and smooth animations
- **Search & Filter**: Real-time search within transcripts
- **Export Options**: Download transcripts as TXT or JSON
- **Accessibility**: Full ARIA labels and keyboard navigation support
- **Recent History**: Quick access to recently viewed transcripts
- **Security**: Environment-based configuration, input validation, and rate limiting

## Tech Stack

### Frontend
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development with strict mode
- **Vite** - Fast build tool and dev server
- **CSS3** - Modern styling with custom properties

### Backend
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe backend code
- **OpenRouter AI** - AI-powered fact-checking
- **youtube-transcript API** - Transcript extraction via Python
- **Rate Limiting** - Request throttling for API protection
- **Input Validation** - Comprehensive URL and data validation

## Prerequisites

- **Node.js** (v18 or higher)
- **Python 3** (for transcript extraction)
- **npm** or **yarn**
- **OpenRouter API Key** (for AI features)

## Installation

### 1. Clone the repository

```bash
cd youtube-transcript-app
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Install Python dependencies

```bash
pip install youtube-transcript-api
```

### 4. Configure Environment Variables

#### Backend Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:

```env
PORT=3001
OPENROUTER_API_KEY=your_api_key_here
AI_MODEL=tngtech/deepseek-r1t2-chimera:free
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ SECURITY WARNING**: Never commit your `.env` file to version control! It's already included in `.gitignore`.

#### Get an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to API Keys section
4. Generate a new API key
5. Add it to your `.env` file

#### Frontend Configuration (Optional)

Create `.env.local` if you need to customize the API URL:

```bash
cp .env.local.example .env.local
```

Edit if needed:

```env
VITE_API_URL=http://localhost:3001
```

## Running the Application

You need to run both the backend server and the frontend development server.

### Method 1: Two Terminals

#### Terminal 1 - Backend Server
```bash
npm run server
```
This starts the Express server on `http://localhost:3001`

#### Terminal 2 - Frontend Dev Server
```bash
npm run dev
```
This starts the Vite dev server (typically on `http://localhost:5173`)

### Method 2: Using a Process Manager

You can use a tool like `concurrently` to run both servers:

```bash
npm install -g concurrently
concurrently "npm run server" "npm run dev"
```

## Usage

1. **Open your browser** and navigate to the frontend URL (shown in Terminal 2, usually `http://localhost:5173`)
2. **Enter a YouTube video URL** or video ID in the input field
3. **Click "Get Transcript"** or press Enter
4. **View the transcript** with timestamps for each segment
5. **Use AI Fact-Checking** by clicking the "Fact Check & Correct" button (requires API key)
6. **Search** within the transcript using the search bar
7. **Copy segments** by clicking on them
8. **Download** the entire transcript as TXT or JSON

## Supported URL Formats

The application supports all common YouTube URL formats:

- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`
- Shorts: `https://youtube.com/shorts/VIDEO_ID`
- Embed: `https://www.youtube.com/embed/VIDEO_ID`
- Video ID only: `VIDEO_ID`

## Project Structure

```
youtube-transcript-app/
├── src/
│   ├── App.tsx              # Main React component
│   ├── App.css              # Component styling
│   ├── config.ts            # Frontend configuration constants
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles
├── config/
│   └── index.ts             # Server configuration with env validation
├── server.ts                # Express backend server
├── fetch_transcript.py      # Python script for transcript extraction
├── .env                     # Environment variables (DO NOT COMMIT)
├── .env.example             # Environment variables template
├── .env.local.example       # Frontend env template
├── package.json
├── tsconfig.json            # TypeScript configuration
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
      "duration": 2500,
      "offset": 1000
    }
  ],
  "videoId": "VIDEO_ID"
}
```

### POST /api/enhance

AI-powered fact-checking and correction of transcript.

**Request Body:**
```json
{
  "transcript": [...]
}
```

**Response:**
```json
{
  "success": true,
  "transcript": [
    {
      "text": "Corrected text",
      "duration": 2500,
      "offset": 1000,
      "original": "Original text",
      "corrected": "Corrected text",
      "hasError": true
    }
  ]
}
```

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T12:00:00.000Z"
}
```

## Security Features

### ✅ What We've Implemented

1. **Environment Variables**: All sensitive data (API keys) stored in `.env` files
2. **Input Validation**: Comprehensive URL and data validation using `validator` library
3. **Rate Limiting**: API endpoints protected against abuse (100 requests per 15 minutes)
4. **CORS Configuration**: Controlled cross-origin resource sharing
5. **Request Timeouts**: Automatic timeout for long-running requests
6. **Error Handling**: Comprehensive error handling and logging
7. **TypeScript Strict Mode**: Type safety throughout the codebase

### 🔒 Security Best Practices

- **Never commit `.env` files** to version control
- **Rotate API keys regularly**
- **Use HTTPS in production** (configure reverse proxy like Nginx)
- **Keep dependencies updated**: Run `npm audit` regularly
- **Validate all user input** on both client and server
- **Monitor rate limits** and adjust based on usage patterns

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Deploy these files to your web server along with the backend server.

### Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a process manager (PM2, systemd)
- [ ] Configure HTTPS with SSL certificates
- [ ] Set up reverse proxy (Nginx, Caddy)
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Enable CORS only for your production domain
- [ ] Use production-grade API keys
- [ ] Set up database for persistent storage (if needed)

## Development

### Code Quality

The project uses:
- **ESLint** for code linting
- **TypeScript** for type checking
- **Prettier** (recommended) for code formatting

Run linting:
```bash
npm run lint
```

Run type checking:
```bash
npm run build
```

### Code Structure

- **Organized by feature**: Components and utilities are well-organized
- **Type safety**: All code uses TypeScript with strict mode
- **Error handling**: Comprehensive try-catch blocks and error messages
- **Logging**: Detailed console logging for debugging
- **Comments**: JSDoc comments for all functions
- **Constants**: Centralized configuration in config files

## Troubleshooting

### "Failed to connect to server" error

- Make sure the backend server is running on port 3001
- Check if there are any CORS issues in the browser console
- Verify your `.env` file is properly configured

### "No transcript available" error

- Some videos don't have transcripts/captions available
- Make sure the video URL is correct and the video exists
- Try with a different video that you know has captions
- Check if the video has age restrictions or is private

### API Key Issues

- Verify your OpenRouter API key is correctly set in `.env`
- Check if you have credits/quota remaining on your API account
- Look for API errors in the server console logs

### Python Script Errors

- Ensure Python 3 is installed: `python3 --version`
- Install required package: `pip install youtube-transcript-api`
- Check file permissions on `fetch_transcript.py`

## Performance Optimization

- **Batch Processing**: AI requests are batched to reduce API calls
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Memoization**: React hooks optimize re-renders
- **Code Splitting**: Vite automatically splits code for faster loading
- **Lazy Loading**: Components and resources loaded on demand

## Accessibility

The application is built with accessibility in mind:

- **ARIA Labels**: All interactive elements have proper ARIA labels
- **Keyboard Navigation**: Full keyboard support for all features
- **Screen Reader Support**: Semantic HTML and ARIA live regions
- **Focus Management**: Proper focus indicators and tab order
- **Color Contrast**: WCAG AA compliant color contrast ratios

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with proper TypeScript types
4. Add JSDoc comments for new functions
5. Test your changes thoroughly
6. Run linting: `npm run lint`
7. Commit with descriptive messages
8. Push to your fork and create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Changelog

### Version 2.0.0 - Quality & Security Update

- ✅ Moved API keys to environment variables
- ✅ Added comprehensive input validation and sanitization
- ✅ Implemented rate limiting for API protection
- ✅ Added JSDoc comments throughout codebase
- ✅ Improved error handling and logging
- ✅ Added retry logic with exponential backoff
- ✅ Enhanced accessibility with ARIA labels
- ✅ Created centralized configuration system
- ✅ Improved TypeScript type safety
- ✅ Added health check endpoint
- ✅ Enhanced code organization and structure
- ✅ Updated documentation with security best practices

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

---

**Built with ❤️ using React, TypeScript, and Express**
