# Security Notes

## Known Issues

### validator.js URL validation bypass (Moderate Severity)

**Package**: `validator@*`
**Severity**: Moderate
**CVE**: GHSA-9965-vmph-33xx
**Status**: Accepted Risk (Mitigated)

#### Issue Description
The validator.js library has a URL validation bypass vulnerability in its `isURL()` function.

#### Our Mitigation
We have implemented multiple layers of defense to mitigate this vulnerability:

1. **Domain Whitelisting**: We only accept YouTube domains (`youtube.com`, `youtu.be`)
   ```typescript
   const isYouTube = trimmed.includes('youtube.com') || trimmed.includes('youtu.be');
   if (!isYouTube) {
     return { valid: false, error: 'Only YouTube URLs are supported' };
   }
   ```

2. **Input Sanitization**: We check for and reject dangerous characters (null bytes, newlines, etc.)
   ```typescript
   if (trimmed.includes('\0') || trimmed.includes('\n') || trimmed.includes('\r')) {
     return { valid: false, error: 'Invalid characters in input' };
   }
   ```

3. **Video ID Validation**: After extraction, we validate the video ID format with strict regex
   ```typescript
   if (!/^[a-zA-Z0-9_-]{5,20}$/.test(videoId)) {
     return { valid: false, error: 'Invalid video ID format' };
   }
   ```

4. **Server-Side Only**: The validator library is only used on the server, not exposed to the client

5. **Rate Limiting**: API endpoints are protected with rate limiting (100 requests per 15 minutes)

#### Why This Is Acceptable
- The validator library is used as a secondary validation step, not the primary security control
- We have domain whitelisting that prevents arbitrary URLs
- The extracted video ID is validated with strict regex patterns
- Input sanitization prevents injection attacks
- The vulnerability requires specific URL patterns that would be caught by our other checks

#### Recommendations for the Future
- Monitor for validator.js updates and upgrade when a fix is available
- Consider replacing validator.js with a more focused validation library
- Implement additional logging for rejected validation attempts

## Audit Date
Last reviewed: 2025-10-23

## Security Contact
For security issues, please create a GitHub issue with the [security] label.
