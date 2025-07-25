"""
Journal processing endpoints.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, AsyncGenerator, Optional, Union
from pydantic import BaseModel
import logging
from pathlib import Path
from datetime import datetime
import re
import asyncio
import json

from core.journal_parser import JournalParser
from core.graphiti_client import graphiti_client
from core.import_history import import_history_manager
from core.personal_schema import PersonalSchemaManager

router = APIRouter()
logger = logging.getLogger(__name__)
parser = JournalParser()


class JournalImportRequest(BaseModel):
    """Request model for journal import."""
    folder_path: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class JournalEntry(BaseModel):
    """Model for a single journal entry."""
    filename: str
    path: str
    content: str


class JournalBatchImportRequest(BaseModel):
    """Request model for batch journal import."""
    entries: List[JournalEntry]


class JournalImportResponse(BaseModel):
    """Response model for journal import."""
    processed_files: int
    extracted_entities: int
    created_relationships: int
    errors: List[str] = []


@router.post("/import", response_model=JournalImportResponse)
async def import_journals(request: JournalImportRequest):
    """Import journal entries from a folder."""
    logger.info(f"Starting import from: {request.folder_path}")
    
    # Validate folder exists
    folder = Path(request.folder_path)
    if not folder.exists():
        raise HTTPException(status_code=400, detail=f"Folder does not exist: {request.folder_path}")
    
    if not folder.is_dir():
        raise HTTPException(status_code=400, detail=f"Path is not a directory: {request.folder_path}")
    
    errors = []
    
    try:
        # Parse journal entries
        entries = parser.parse_directory(request.folder_path)
        
        if not entries:
            return JournalImportResponse(
                processed_files=0,
                extracted_entities=0,
                created_relationships=0,
                errors=["No journal files found in the specified directory. Make sure files are named in YYYY-MM-DD.md format."]
            )
        
        # Initialize Graphiti client if needed
        if not graphiti_client.graphiti:
            await graphiti_client.initialize()
        
        # Process entries with Graphiti
        processed_files = 0
        extracted_entities = 0
        created_relationships = 0
        
        for entry in entries:
            try:
                # Extract date from filename
                match = parser.date_pattern.match(entry.filename)
                if not match:
                    errors.append(f"Invalid filename format: {entry.filename}")
                    continue
                
                # Extract date components
                year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                entry_date = datetime(year, month, day)
                
                # Process with Graphiti
                result = await graphiti_client.process_journal_entry(
                    content=entry.content,
                    date=entry_date,
                    source_file=entry.path
                )
                
                processed_files += 1
                extracted_entities += result["entities_extracted"]
                created_relationships += result["relationships_extracted"]
                
                logger.info(f"Processed {entry.filename}: {result['entities_extracted']} entities, {result['relationships_extracted']} relationships")
                
            except Exception as e:
                logger.error(f"Error processing {entry.filename}: {str(e)}")
                errors.append(f"Error processing {entry.filename}: {str(e)}")
        
        logger.info(f"Successfully processed {processed_files} journal entries")
        
        return JournalImportResponse(
            processed_files=processed_files,
            extracted_entities=extracted_entities,
            created_relationships=created_relationships,
            errors=errors
        )
        
    except Exception as e:
        logger.error(f"Error during import: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-batch", response_model=JournalImportResponse)
async def import_journal_batch(request: JournalBatchImportRequest):
    """Import journal entries sent from the frontend."""
    logger.info(f"Starting batch import of {len(request.entries)} entries")
    
    errors = []
    processed_files = 0
    total_entities = 0
    total_relationships = 0
    
    try:
        # Initialize Graphiti client if needed
        if not graphiti_client.graphiti:
            await graphiti_client.initialize()
        
        # Process each journal entry with progress logging
        for i, entry in enumerate(request.entries, 1):
            try:
                logger.info(f"Processing entry {i}/{len(request.entries)}: {entry.filename}")
                
                # Validate filename matches date pattern
                match = parser.date_pattern.match(entry.filename)
                if not match:
                    errors.append(f"Invalid filename format: {entry.filename}")
                    continue
                
                # Extract date from filename
                year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                entry_date = datetime(year, month, day)
                
                # Process with Graphiti using personal schema
                result = await graphiti_client.process_journal_entry(
                    content=entry.content,
                    date=entry_date,
                    source_file=entry.path,
                    user_id="default"  # TODO: Support multi-user in future
                )
                
                processed_files += 1
                total_entities += result["entities_extracted"]
                total_relationships += result["relationships_extracted"]
                
                logger.info(f"Successfully processed {entry.filename} ({i}/{len(request.entries)}): {result['entities_extracted']} entities, {result['relationships_extracted']} relationships")
                
            except Exception as e:
                logger.error(f"Error processing {entry.filename} ({i}/{len(request.entries)}): {str(e)}")
                errors.append(f"Error processing {entry.filename}: {str(e)}")
                
                # If we're hitting rate limits, add a delay
                if "429" in str(e) or "rate limit" in str(e).lower():
                    logger.warning("Rate limit hit, adding 30 second delay before continuing...")
                    await asyncio.sleep(30)
        
        logger.info(f"Batch import completed. Processed {processed_files}/{len(request.entries)} files")
        
        return JournalImportResponse(
            processed_files=processed_files,
            extracted_entities=total_entities,
            created_relationships=total_relationships,
            errors=errors
        )
        
    except Exception as e:
        logger.error(f"Error during batch import: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-batch-stream")
async def import_journal_batch_stream(request: JournalBatchImportRequest):
    """Import journal entries with streaming progress updates."""
    async def generate_progress() -> AsyncGenerator[str, None]:
        errors = []
        processed_files = 0
        total_entities = 0
        total_relationships = 0
        
        try:
            # Get current schema version
            schema_manager = PersonalSchemaManager()
            schema = schema_manager.get_schema("default")
            schema_version = schema.updated_at.isoformat() if schema else None
            
            # Start import session
            session = import_history_manager.start_import_session(
                total_files=len(request.entries),
                user_id="default",
                import_source="manual",
                schema_version=schema_version
            )
            
            # Send initial status
            yield f"data: {json.dumps({'type': 'start', 'total': len(request.entries), 'session_id': session.id})}\n\n"
            
            # Initialize Graphiti client if needed
            if not graphiti_client.graphiti:
                yield f"data: {json.dumps({'type': 'status', 'message': 'Initializing AI client...'})}\n\n"
                await graphiti_client.initialize()
            
            # Process each journal entry
            for i, entry in enumerate(request.entries, 1):
                try:
                    # Send processing status
                    yield f"data: {json.dumps({'type': 'processing', 'current': i, 'total': len(request.entries), 'filename': entry.filename})}\n\n"
                    
                    # Validate filename matches date pattern
                    match = parser.date_pattern.match(entry.filename)
                    if not match:
                        errors.append(f"Invalid filename format: {entry.filename}")
                        yield f"data: {json.dumps({'type': 'error', 'filename': entry.filename, 'error': 'Invalid filename format'})}\n\n"
                        continue
                    
                    # Extract date from filename
                    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                    entry_date = datetime(year, month, day)
                    
                    # Process with Graphiti using personal schema
                    result = await graphiti_client.process_journal_entry(
                        content=entry.content,
                        date=entry_date,
                        source_file=entry.path,
                        user_id="default"  # TODO: Support multi-user in future
                    )
                    
                    processed_files += 1
                    total_entities += result["entities_extracted"]
                    total_relationships += result["relationships_extracted"]
                    
                    # Update import history
                    import_history_manager.update_session(
                        session_id=session.id,
                        processed_files=processed_files,
                        entities_added=result["entities_extracted"],
                        relationships_added=result["relationships_extracted"]
                    )
                    
                    # Send success status for this file with schema info
                    file_result = {
                        'type': 'file_complete', 
                        'current': i, 
                        'filename': entry.filename, 
                        'entities': result['entities_extracted'], 
                        'relationships': result['relationships_extracted']
                    }
                    
                    # Include schema-specific info if available
                    if result.get('schema_applied'):
                        file_result['schema_applied'] = True
                        # Include entity type breakdown
                        entity_types = {}
                        for entity in result.get('entities', []):
                            etype = entity.get('schema_type', entity.get('type', 'Unknown'))
                            entity_types[etype] = entity_types.get(etype, 0) + 1
                        file_result['entity_types'] = entity_types
                        
                        # Update history with entity types
                        for etype, count in entity_types.items():
                            import_history_manager.update_session(
                                session_id=session.id,
                                entity_type=etype,
                                entity_count=count
                            )
                    
                    yield f"data: {json.dumps(file_result)}\n\n"
                    
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Error processing {entry.filename}: {error_msg}")
                    
                    # Check if it's a rate limit error
                    if "rate" in error_msg.lower() or "429" in error_msg:
                        # Rate limit hit - add delay and retry once
                        yield f"data: {json.dumps({'type': 'status', 'message': f'Rate limit hit for {entry.filename}, waiting 30s before retry...'})}\n\n"
                        await asyncio.sleep(30)
                        
                        try:
                            # Retry once
                            result = await graphiti_client.process_journal_entry(
                                content=entry.content,
                                date=entry_date,
                                source_file=entry.path,
                                user_id="default"
                            )
                            
                            processed_files += 1
                            total_entities += result["entities_extracted"]
                            total_relationships += result["relationships_extracted"]
                            
                            # Send success status for retry
                            file_result = {
                                'type': 'file_complete', 
                                'current': i, 
                                'filename': entry.filename, 
                                'entities': result['entities_extracted'], 
                                'relationships': result['relationships_extracted'],
                                'retry': True
                            }
                            
                            if result.get('schema_applied'):
                                file_result['schema_applied'] = True
                                entity_types = {}
                                for entity in result.get('entities', []):
                                    etype = entity.get('schema_type', entity.get('type', 'Unknown'))
                                    entity_types[etype] = entity_types.get(etype, 0) + 1
                                file_result['entity_types'] = entity_types
                            
                            yield f"data: {json.dumps(file_result)}\n\n"
                            continue
                            
                        except Exception as retry_error:
                            error_msg = f"Retry failed: {str(retry_error)}"
                            logger.error(f"Retry failed for {entry.filename}: {str(retry_error)}")
                    
                    errors.append(f"{entry.filename}: {error_msg}")
                    
                    # Update history with error
                    import_history_manager.update_session(
                        session_id=session.id,
                        failed_files=len(errors),
                        error=f"{entry.filename}: {error_msg}"
                    )
                    
                    yield f"data: {json.dumps({'type': 'error', 'filename': entry.filename, 'error': error_msg})}\n\n"
            
            # Mark session as complete
            import_history_manager.complete_session(session.id, success=len(errors) == 0)
            
            # Send completion status
            yield f"data: {json.dumps({'type': 'complete', 'processed_files': processed_files, 'total_entities': total_entities, 'total_relationships': total_relationships, 'errors': errors})}\n\n"
            
        except Exception as e:
            logger.error(f"Error during batch import: {str(e)}")
            # Mark session as failed
            import_history_manager.complete_session(session.id, success=False)
            import_history_manager.update_session(
                session_id=session.id,
                error=f"Fatal error: {str(e)}"
            )
            yield f"data: {json.dumps({'type': 'fatal_error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_progress(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable Nginx buffering
        }
    )


@router.get("/check-unprocessed")
async def check_unprocessed_journals(vault_path: str, after_date: Optional[str] = None):
    """Check for journal files that haven't been processed yet."""
    try:
        parser = JournalParser()
        entries = await parser.scan_directory(vault_path)
        
        if not entries:
            return {"unprocessed": [], "total": 0}
        
        # Get list of already processed journal dates from Neo4j
        processed_dates = set()
        if graphiti_client.driver:
            async with graphiti_client.driver.session() as session:
                result = await session.run("""
                    MATCH (e:Episodic)
                    WHERE e.name STARTS WITH 'Journal Entry - '
                    RETURN e.name as name
                """)
                
                async for record in result:
                    # Extract date from "Journal Entry - YYYY-MM-DD"
                    name = record["name"]
                    if " - " in name:
                        date_str = name.split(" - ")[-1]
                        processed_dates.add(date_str)
        
        # Filter to only unprocessed entries
        unprocessed = []
        for entry in entries:
            # Extract date from filename
            match = parser.date_pattern.match(entry.filename)
            if match:
                year, month, day = match.groups()
                date_str = f"{year}-{month}-{day}"
                
                # Skip if already processed
                if date_str in processed_dates:
                    continue
                    
                # Skip if before the specified date
                if after_date and date_str <= after_date:
                    continue
                
                unprocessed.append({
                    "filename": entry.filename,
                    "path": entry.path,
                    "date": date_str
                })
        
        # Sort by date
        unprocessed.sort(key=lambda x: x["date"])
        
        return {
            "unprocessed": unprocessed,
            "total": len(unprocessed),
            "oldest_date": unprocessed[0]["date"] if unprocessed else None,
            "newest_date": unprocessed[-1]["date"] if unprocessed else None
        }
        
    except Exception as e:
        logger.error(f"Error checking unprocessed journals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/import-history")
async def get_import_history(limit: int = 50):
    """Get import history."""
    history = import_history_manager.get_history(limit=limit)
    return {
        "history": [session.dict() for session in history],
        "count": len(history)
    }


@router.get("/import-statistics")
async def get_import_statistics():
    """Get import statistics."""
    return import_history_manager.get_statistics()


@router.post("/process-single")
async def process_single_journal(file: UploadFile = File(...)):
    """Process a single journal file."""
    try:
        # Validate filename
        parser = JournalParser()
        match = parser.date_pattern.match(file.filename)
        if not match:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid filename format: {file.filename}. Expected YYYY-MM-DD.md"
            )
        
        # Extract date
        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
        entry_date = datetime(year, month, day)
        
        # Read file content
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Initialize Graphiti if needed
        if not graphiti_client.graphiti:
            await graphiti_client.initialize()
        
        # Process with Graphiti using personal schema
        result = await graphiti_client.process_journal_entry(
            content=content_str,
            date=entry_date,
            source_file=file.filename,
            user_id="default"  # TODO: Support multi-user in future
        )
        
        return {
            "filename": file.filename,
            "status": "processed",
            "episode_id": result["episode_id"],
            "date": result["date"],
            "entities_extracted": result["entities_extracted"],
            "relationships_extracted": result["relationships_extracted"],
            "entities": result["entities"],
            "relationships": result["relationships"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing single file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))