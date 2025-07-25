# Setting up Google Gemini for JournalGraph

JournalGraph now uses Google Gemini instead of OpenAI for AI processing. Gemini offers:
- Faster processing speeds
- Higher rate limits
- Lower costs
- Better performance for knowledge graph extraction

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Get API key"
4. Create a new project or select an existing one
5. Copy the generated API key

## Configuring JournalGraph

### For Docker Users

1. Create a `.env.docker.local` file in the project root:
```bash
cp .env.docker .env.docker.local
```

2. Edit `.env.docker.local` and add your API key:
```
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

3. Restart the backend:
```bash
docker-compose restart backend
```

### For Local Development

Set the environment variable:
```bash
export GEMINI_API_KEY="your-actual-gemini-api-key-here"
```

## Verifying the Setup

Run the test script to verify Gemini is working:
```bash
docker exec journalgraph-backend python test_gemini_integration.py
```

You should see:
```
✅ Graphiti initialized successfully with Gemini
✅ Successfully processed journal entry!
```

## Gemini Models Used

- **LLM**: `gemini-2.5-flash` - Latest Flash model for entity extraction
- **Embeddings**: `text-embedding-004` - Latest embedding model for semantic search
- **Reranker**: `gemini-2.5-flash` - Same model used for result ranking

## Troubleshooting

### "API key not valid" Error
- Ensure you've copied the entire API key
- Check that the key is active in Google AI Studio
- Verify the `.env.docker.local` file is being used

### Rate Limits
While Gemini has much higher rate limits than OpenAI, you may still hit limits with very large imports. If this happens:
- Process journals in smaller batches (10-20 at a time)
- Add a delay between batches
- Consider upgrading to a paid Gemini plan

### Performance Tips
- Gemini Flash models are optimized for speed
- Processing 50+ journal entries should take only a few minutes
- For best results, keep journal entries under 2000 words each