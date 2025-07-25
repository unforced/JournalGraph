#!/usr/bin/env python3
"""
Test script to verify Graphiti integration is working.
Run this script to test the connection to Neo4j and OpenAI.
"""

import asyncio
import logging
from datetime import datetime
from core.graphiti_client import graphiti_client

logging.basicConfig(level=logging.INFO)

async def test_graphiti():
    """Test Graphiti integration with a sample journal entry."""
    try:
        # Initialize Graphiti
        print("Initializing Graphiti client...")
        await graphiti_client.initialize()
        print("✓ Graphiti client initialized successfully")
        
        # Test with a sample journal entry
        sample_content = """
        Today was a productive day. I had a meeting with Sarah about the new project timeline.
        We discussed the upcoming milestones and agreed to focus on the MVP features first.
        
        Later, I spent time working on the authentication system for our web app.
        The OAuth integration is almost complete, just need to finish the refresh token logic.
        
        In the evening, I read an interesting article about graph databases and their applications
        in knowledge management systems. This could be useful for our current project.
        """
        
        print("\nProcessing sample journal entry...")
        result = await graphiti_client.process_journal_entry(
            content=sample_content,
            date=datetime.now(),
            source_file="test_entry.md"
        )
        
        print(f"\n✓ Successfully processed journal entry:")
        print(f"  - Episode ID: {result['episode_id']}")
        print(f"  - Entities extracted: {result['entities_extracted']}")
        print(f"  - Relationships extracted: {result['relationships_extracted']}")
        
        if result['entities']:
            print("\nExtracted Entities:")
            for entity in result['entities']:
                print(f"  - {entity['name']} ({entity['type']}): {entity['summary']}")
        
        if result['relationships']:
            print("\nExtracted Relationships:")
            for rel in result['relationships']:
                print(f"  - {rel['source']} --[{rel['type']}]--> {rel['target']}")
                print(f"    Fact: {rel['fact']}")
        
        # Clean up
        await graphiti_client.close()
        print("\n✓ Test completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_graphiti())