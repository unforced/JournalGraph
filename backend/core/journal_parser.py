"""
Journal parser for extracting content from Obsidian daily notes.
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class JournalEntry:
    """Represents a single journal entry."""
    
    def __init__(self, file_path: str, date: datetime, content: str):
        self.file_path = file_path
        self.date = date
        self.content = content
        self.metadata = self._extract_metadata()
    
    def _extract_metadata(self) -> Dict[str, Any]:
        """Extract frontmatter and other metadata from the content."""
        metadata = {}
        
        # Extract frontmatter if present
        frontmatter_match = re.match(r'^---\n(.*?)\n---\n', self.content, re.DOTALL)
        if frontmatter_match:
            # Simple YAML parsing (could use PyYAML for more robust parsing)
            frontmatter = frontmatter_match.group(1)
            for line in frontmatter.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip()
        
        # Extract tags
        tags = re.findall(r'#(\w+)', self.content)
        if tags:
            metadata['tags'] = list(set(tags))
        
        # Extract links to other notes
        links = re.findall(r'\[\[([^\]]+)\]\]', self.content)
        if links:
            metadata['links'] = links
        
        return metadata


class JournalParser:
    """Parser for Obsidian journal entries."""
    
    def __init__(self):
        self.date_pattern = re.compile(r'(\d{4})-(\d{2})-(\d{2})\.md$')
    
    def parse_directory(self, directory_path: str) -> List[JournalEntry]:
        """Parse all journal entries in a directory."""
        entries = []
        directory = Path(directory_path)
        
        if not directory.exists():
            logger.error(f"Directory does not exist: {directory_path}")
            return entries
        
        # Find all markdown files matching date pattern
        for file_path in directory.glob("*.md"):
            match = self.date_pattern.search(file_path.name)
            if match:
                try:
                    entry = self.parse_file(str(file_path))
                    if entry:
                        entries.append(entry)
                except Exception as e:
                    logger.error(f"Error parsing file {file_path}: {e}")
        
        # Sort by date
        entries.sort(key=lambda e: e.date)
        
        logger.info(f"Parsed {len(entries)} journal entries from {directory_path}")
        return entries
    
    def parse_file(self, file_path: str) -> Optional[JournalEntry]:
        """Parse a single journal file."""
        file_path_obj = Path(file_path)
        
        # Extract date from filename
        match = self.date_pattern.search(file_path_obj.name)
        if not match:
            logger.warning(f"File does not match date pattern: {file_path}")
            return None
        
        year, month, day = match.groups()
        try:
            date = datetime(int(year), int(month), int(day))
        except ValueError:
            logger.error(f"Invalid date in filename: {file_path}")
            return None
        
        # Read content
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            return None
        
        return JournalEntry(file_path, date, content)
    
    def extract_sections(self, content: str) -> Dict[str, str]:
        """Extract sections from journal content based on headers."""
        sections = {}
        
        # Split by headers (## or ###)
        header_pattern = re.compile(r'^(#{2,3})\s+(.+)$', re.MULTILINE)
        
        current_section = "main"
        current_content = []
        last_pos = 0
        
        for match in header_pattern.finditer(content):
            # Add content before this header to current section
            current_content.append(content[last_pos:match.start()].strip())
            
            # Save current section if it has content
            if current_content and any(current_content):
                sections[current_section] = '\n'.join(current_content)
            
            # Start new section
            current_section = match.group(2).strip()
            current_content = []
            last_pos = match.end()
        
        # Add remaining content
        current_content.append(content[last_pos:].strip())
        if current_content and any(current_content):
            sections[current_section] = '\n'.join(current_content)
        
        return sections