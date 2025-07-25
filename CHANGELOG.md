# Changelog

All notable changes to JournalGraph will be documented in this file.

## [Unreleased] - 2025-01-21

### Changed
- **Migrated from OpenAI to Google Gemini API** for improved performance and cost efficiency
  - Now using `gemini-2.5-flash` model for all LLM operations
  - Significantly reduced processing time from ~81 seconds per journal entry to much faster speeds
  - Updated all dependencies to use `graphiti-core[google-genai]`

### Added
- **Real-time import progress tracking** with streaming updates
  - New SSE endpoint `/api/journal/import-batch-stream` for live progress updates
  - Enhanced UI with progress bar showing current file being processed
  - Live counters for entities and relationships extracted
  - Error collection and display during import process
  - Visual feedback with animated progress indicators

### Fixed
- Rate limiting issues that caused imports to hang for 30+ minutes
- API key configuration not loading properly from environment files
- Docker compose environment variable overrides preventing proper configuration

### Technical Details
- Disabled Graphiti reranker temporarily due to hardcoded model issues
- Implemented Server-Sent Events (SSE) for real-time communication
- Added proper error handling and logging throughout the import pipeline
- Updated all documentation to reflect Gemini integration

### Configuration
- Changed primary API key from `OPENAI_API_KEY` to `GEMINI_API_KEY`
- Maintained backward compatibility for existing configurations
- Updated `.env.example` and documentation accordingly