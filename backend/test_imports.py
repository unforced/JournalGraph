#!/usr/bin/env python3
"""Test what imports are available from graphiti_core"""

import sys
import importlib

print("Testing Graphiti imports...")

# Test base imports
try:
    import graphiti_core
    print("✅ graphiti_core imported successfully")
    print(f"   Location: {graphiti_core.__file__}")
except ImportError as e:
    print(f"❌ Failed to import graphiti_core: {e}")

# Check what's available in the package
print("\nChecking available modules:")
modules_to_check = [
    'graphiti_core.llm_client',
    'graphiti_core.embedder',
    'graphiti_core.cross_encoder',
    'graphiti_core.llm_client.google_genai_client',
    'graphiti_core.llm_client.gemini_client',
    'graphiti_core.embedder.google_genai_embedder',
    'graphiti_core.embedder.gemini_embedder',
]

for module_name in modules_to_check:
    try:
        mod = importlib.import_module(module_name)
        print(f"✅ {module_name}")
        # List attributes
        attrs = [attr for attr in dir(mod) if not attr.startswith('_')]
        if attrs:
            print(f"   Available: {', '.join(attrs[:5])}")
    except ImportError as e:
        print(f"❌ {module_name}: {e}")

# Try to find what's actually available
print("\nChecking graphiti_core directory structure:")
try:
    import graphiti_core
    import os
    base_path = os.path.dirname(graphiti_core.__file__)
    
    for root, dirs, files in os.walk(base_path):
        # Only show first two levels
        level = root.replace(base_path, '').count(os.sep)
        if level < 2:
            indent = ' ' * 2 * level
            print(f"{indent}{os.path.basename(root)}/")
            subindent = ' ' * 2 * (level + 1)
            for file in files:
                if file.endswith('.py') and not file.startswith('_'):
                    print(f"{subindent}{file}")
except Exception as e:
    print(f"Error exploring package: {e}")