#!/usr/bin/env python3
"""
Test script for Gemini integration with Graphiti.
Tests that Gemini is properly configured and can process journal entries.
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path

# Add parent directory to Python path
import sys
sys.path.insert(0, str(Path(__file__).parent))

from core.config import settings
from core.graphiti_client import graphiti_client


async def test_gemini_integration():
    """Test Gemini integration with a sample journal entry."""
    print("Testing Gemini integration with Graphiti...")
    print(f"Gemini API Key configured: {'Yes' if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != 'test-key' else 'No'}")
    
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == 'test-key':
        print("\n⚠️  WARNING: GEMINI_API_KEY not set or using test key!")
        print("Please set GEMINI_API_KEY environment variable")
        return
    
    try:
        # Initialize Graphiti with Gemini
        print("\n1. Initializing Graphiti with Gemini...")
        await graphiti_client.initialize()
        print("✅ Graphiti initialized successfully with Gemini")
        
        # Test with a sample journal entry
        print("\n2. Processing sample journal entry...")
        sample_content = """
        Today was productive. Met with Sarah about the new AI project - we're exploring 
        ways to integrate LLMs into our workflow. The team seems excited about the 
        possibilities. Also finished reading "The Pragmatic Programmer" - lots of great 
        insights about software craftsmanship.
        
        In the afternoon, worked on debugging the authentication system. Found a race 
        condition that was causing intermittent failures. The fix was simpler than expected.
        
        Personal note: Need to schedule dentist appointment next week.
        """
        
        result = await graphiti_client.process_journal_entry(
            content=sample_content,
            date=datetime(2024, 1, 15),
            source_file="test-entry.md"
        )
        
        print(f"✅ Successfully processed journal entry!")
        print(f"   - Episode ID: {result['episode_id']}")
        print(f"   - Entities extracted: {result['entities_extracted']}")
        print(f"   - Relationships created: {result['relationships_extracted']}")
        
        if result['entities']:
            print("\n   Extracted entities:")
            for entity in result['entities'][:5]:  # Show first 5
                print(f"   - {entity['name']} ({entity['type']})")
        
        if result['relationships']:
            print("\n   Extracted relationships:")
            for rel in result['relationships'][:3]:  # Show first 3
                print(f"   - {rel['type']}: {rel['fact']}")
        
        # Test search functionality
        print("\n3. Testing search functionality...")
        search_results = await graphiti_client.search_graph("AI project")
        print(f"✅ Search completed, found {len(search_results)} results")
        
        print("\n🎉 Gemini integration test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during test: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
    
    finally:
        await graphiti_client.close()


if __name__ == "__main__":
    asyncio.run(test_gemini_integration())