#!/usr/bin/env python3
"""
Test script to verify Graphiti integration works correctly.
Run this to ensure all components are properly connected before deployment.
"""

import asyncio
import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('../.env.docker')

# Sample journal content for testing
SAMPLE_JOURNAL_CONTENT = """
Today was a productive day. Met with Sarah from the marketing team to discuss the new product launch campaign. 
We decided to focus on social media engagement and influencer partnerships.

Also had a breakthrough with the Python automation project - finally got the data pipeline working smoothly. 
The key was implementing proper error handling and retry logic.

Afternoon: Reading "Atomic Habits" by James Clear. The concept of habit stacking is fascinating and 
I'm going to try implementing it for my morning routine.

Evening: Dinner with the family at Luigi's Italian Restaurant. Great pasta and even better conversation.
"""

SAMPLE_DATE = datetime(2024, 1, 15)
SAMPLE_FILE = "2024-01-15.md"


async def test_neo4j_connection():
    """Test direct Neo4j connection."""
    from neo4j import AsyncGraphDatabase
    from core.config import settings
    
    logger.info("Testing Neo4j connection...")
    try:
        driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        
        async with driver.session() as session:
            result = await session.run("RETURN 'Connection successful!' as message")
            record = await result.single()
            logger.info(f"Neo4j test result: {record['message']}")
        
        await driver.close()
        logger.info("✓ Neo4j connection test passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Neo4j connection test failed: {str(e)}")
        return False


async def test_graphiti_initialization():
    """Test Graphiti client initialization."""
    from core.graphiti_client import graphiti_client
    
    logger.info("Testing Graphiti initialization...")
    try:
        await graphiti_client.initialize()
        logger.info("✓ Graphiti initialization test passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Graphiti initialization test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_journal_processing():
    """Test processing a journal entry."""
    from core.graphiti_client import graphiti_client
    
    logger.info("Testing journal entry processing...")
    try:
        # Make sure client is initialized
        if not graphiti_client.graphiti:
            await graphiti_client.initialize()
        
        # Process the sample journal entry
        result = await graphiti_client.process_journal_entry(
            content=SAMPLE_JOURNAL_CONTENT,
            date=SAMPLE_DATE,
            source_file=SAMPLE_FILE
        )
        
        logger.info(f"Processing result:")
        logger.info(f"  - Episode ID: {result['episode_id']}")
        logger.info(f"  - Date: {result['date']}")
        logger.info(f"  - Entities extracted: {result['entities_extracted']}")
        logger.info(f"  - Relationships extracted: {result['relationships_extracted']}")
        
        if result['entities']:
            logger.info("  - Sample entities:")
            for entity in result['entities'][:5]:  # Show first 5
                logger.info(f"    • {entity['name']} ({entity['type']})")
        
        if result['relationships']:
            logger.info("  - Sample relationships:")
            for rel in result['relationships'][:3]:  # Show first 3
                logger.info(f"    • {rel['source_uuid']} --[{rel['type']}]--> {rel['target_uuid']}")
        
        logger.info("✓ Journal processing test passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Journal processing test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_api_endpoint():
    """Test the API endpoint directly."""
    import aiohttp
    
    logger.info("Testing API endpoint...")
    
    # Create test payload
    test_payload = {
        "entries": [{
            "filename": SAMPLE_FILE,
            "path": f"/test/{SAMPLE_FILE}",
            "content": SAMPLE_JOURNAL_CONTENT
        }]
    }
    
    # Use localhost since we're running inside the container
    api_url = "http://localhost:8000"
    
    try:
        async with aiohttp.ClientSession() as session:
            # First check health endpoint
            async with session.get(f"{api_url}/api/health") as resp:
                health_data = await resp.json()
                logger.info(f"Health check: {health_data}")
            
            # Then test import endpoint
            async with session.post(
                f"{api_url}/api/journal/import-batch",
                json=test_payload
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    logger.info(f"API test result: Batch import successful")
                    logger.info(f"  - Processed files: {result['processed_files']}")
                    logger.info(f"  - Extracted entities: {result['extracted_entities']}")
                    logger.info(f"  - Created relationships: {result['created_relationships']}")
                    if result.get('errors'):
                        logger.info(f"  - Errors: {result['errors']}")
                    logger.info("✓ API endpoint test passed")
                    return True
                else:
                    error_text = await resp.text()
                    logger.error(f"✗ API endpoint test failed: {resp.status} - {error_text}")
                    return False
                    
    except Exception as e:
        logger.error(f"✗ API endpoint test failed: {str(e)}")
        return False


async def cleanup_test_data():
    """Clean up test data from Neo4j."""
    from neo4j import AsyncGraphDatabase
    from core.config import settings
    
    logger.info("Cleaning up test data...")
    try:
        driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        
        async with driver.session() as session:
            # Delete test episode and related nodes
            await session.run("""
                MATCH (e:Episode {name: $name})
                OPTIONAL MATCH (e)-[r]-()
                DELETE r, e
            """, name=f"Journal Entry - {SAMPLE_DATE.strftime('%Y-%m-%d')}")
            
            logger.info("✓ Test data cleaned up")
        
        await driver.close()
        
    except Exception as e:
        logger.warning(f"Could not clean up test data: {str(e)}")


async def main():
    """Run all tests."""
    logger.info("=" * 60)
    logger.info("Starting Graphiti Integration Tests")
    logger.info("=" * 60)
    
    # Check environment
    logger.info("\nEnvironment check:")
    logger.info(f"  - OPENAI_API_KEY: {'✓ Set' if os.getenv('OPENAI_API_KEY') else '✗ Not set'}")
    logger.info(f"  - NEO4J_URI: {os.getenv('NEO4J_URI', 'Not set')}")
    logger.info(f"  - Backend API: http://localhost:8000")
    
    if not os.getenv('OPENAI_API_KEY'):
        logger.error("\n✗ OPENAI_API_KEY not set in environment!")
        logger.error("Please ensure .env.docker file contains OPENAI_API_KEY")
        return False
    
    # Run tests
    tests = [
        ("Neo4j Connection", test_neo4j_connection),
        ("Graphiti Initialization", test_graphiti_initialization),
        ("Journal Processing", test_journal_processing),
        ("API Endpoint", test_api_endpoint),
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n--- Running {test_name} ---")
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            logger.error(f"Unexpected error in {test_name}: {str(e)}")
            results.append((test_name, False))
    
    # Clean up
    await cleanup_test_data()
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Test Summary:")
    logger.info("=" * 60)
    
    all_passed = True
    for test_name, success in results:
        status = "✓ PASSED" if success else "✗ FAILED"
        logger.info(f"{test_name}: {status}")
        if not success:
            all_passed = False
    
    logger.info("=" * 60)
    
    if all_passed:
        logger.info("\n✓ All tests passed! Graphiti integration is working correctly.")
        return True
    else:
        logger.error("\n✗ Some tests failed. Please check the logs above.")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)