"""
Import history tracking for journal imports.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ImportSession(BaseModel):
    """Record of a single import session."""
    id: str = Field(default_factory=lambda: datetime.now().isoformat())
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    user_id: str = "default"
    total_files: int = 0
    processed_files: int = 0
    failed_files: int = 0
    total_entities: int = 0
    total_relationships: int = 0
    entity_type_breakdown: Dict[str, int] = {}
    errors: List[str] = []
    status: str = "in_progress"  # in_progress, completed, failed
    import_source: str = "manual"  # manual, auto
    schema_version: Optional[str] = None
    

class ImportHistory(BaseModel):
    """Collection of import sessions."""
    sessions: List[ImportSession] = []
    last_updated: datetime = Field(default_factory=datetime.now)
    

class ImportHistoryManager:
    """Manages import history storage and retrieval."""
    
    def __init__(self, config_dir: str = "./config"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(exist_ok=True)
        self.history_file = self.config_dir / "import_history.json"
        self._history: Optional[ImportHistory] = None
        
    def _load_history(self) -> ImportHistory:
        """Load import history from disk."""
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r') as f:
                    data = json.load(f)
                return ImportHistory(**data)
            except Exception as e:
                logger.error(f"Error loading import history: {e}")
                return ImportHistory()
        return ImportHistory()
    
    def _save_history(self):
        """Save import history to disk."""
        if self._history:
            try:
                with open(self.history_file, 'w') as f:
                    json.dump(self._history.dict(), f, indent=2, default=str)
            except Exception as e:
                logger.error(f"Error saving import history: {e}")
    
    def start_import_session(
        self,
        total_files: int,
        user_id: str = "default",
        import_source: str = "manual",
        schema_version: Optional[str] = None
    ) -> ImportSession:
        """Start a new import session."""
        session = ImportSession(
            total_files=total_files,
            user_id=user_id,
            import_source=import_source,
            schema_version=schema_version
        )
        
        if not self._history:
            self._history = self._load_history()
            
        self._history.sessions.append(session)
        self._history.last_updated = datetime.now()
        
        # Keep only last 100 sessions
        if len(self._history.sessions) > 100:
            self._history.sessions = self._history.sessions[-100:]
            
        self._save_history()
        return session
    
    def update_session(
        self,
        session_id: str,
        processed_files: Optional[int] = None,
        failed_files: Optional[int] = None,
        entities_added: Optional[int] = None,
        relationships_added: Optional[int] = None,
        entity_type: Optional[str] = None,
        entity_count: Optional[int] = None,
        error: Optional[str] = None
    ):
        """Update an ongoing import session."""
        if not self._history:
            self._history = self._load_history()
            
        for session in self._history.sessions:
            if session.id == session_id:
                if processed_files is not None:
                    session.processed_files = processed_files
                if failed_files is not None:
                    session.failed_files = failed_files
                if entities_added is not None:
                    session.total_entities += entities_added
                if relationships_added is not None:
                    session.total_relationships += relationships_added
                if entity_type and entity_count is not None:
                    session.entity_type_breakdown[entity_type] = \
                        session.entity_type_breakdown.get(entity_type, 0) + entity_count
                if error:
                    session.errors.append(error)
                    
                self._history.last_updated = datetime.now()
                self._save_history()
                break
    
    def complete_session(self, session_id: str, success: bool = True):
        """Mark a session as completed."""
        if not self._history:
            self._history = self._load_history()
            
        for session in self._history.sessions:
            if session.id == session_id:
                session.completed_at = datetime.now()
                session.status = "completed" if success else "failed"
                self._history.last_updated = datetime.now()
                self._save_history()
                break
    
    def get_history(self, limit: int = 50) -> List[ImportSession]:
        """Get import history."""
        if not self._history:
            self._history = self._load_history()
        return self._history.sessions[-limit:]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get import statistics."""
        if not self._history:
            self._history = self._load_history()
            
        completed_sessions = [s for s in self._history.sessions if s.status == "completed"]
        
        if not completed_sessions:
            return {
                "total_imports": 0,
                "total_files_processed": 0,
                "total_entities": 0,
                "total_relationships": 0,
                "average_entities_per_file": 0,
                "average_relationships_per_file": 0,
                "most_common_entity_types": [],
                "last_import_date": None
            }
        
        total_files = sum(s.processed_files for s in completed_sessions)
        total_entities = sum(s.total_entities for s in completed_sessions)
        total_relationships = sum(s.total_relationships for s in completed_sessions)
        
        # Aggregate entity types
        entity_type_totals = {}
        for session in completed_sessions:
            for entity_type, count in session.entity_type_breakdown.items():
                entity_type_totals[entity_type] = entity_type_totals.get(entity_type, 0) + count
                
        # Sort entity types by count
        most_common_types = sorted(
            entity_type_totals.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:10]
        
        return {
            "total_imports": len(completed_sessions),
            "total_files_processed": total_files,
            "total_entities": total_entities,
            "total_relationships": total_relationships,
            "average_entities_per_file": total_entities / total_files if total_files > 0 else 0,
            "average_relationships_per_file": total_relationships / total_files if total_files > 0 else 0,
            "most_common_entity_types": [
                {"type": t, "count": c} for t, c in most_common_types
            ],
            "last_import_date": completed_sessions[-1].completed_at.isoformat() if completed_sessions else None
        }
    
    def clear_history(self):
        """Clear all import history."""
        self._history = ImportHistory()
        self._save_history()


# Global instance
import_history_manager = ImportHistoryManager()