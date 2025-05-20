#!/usr/bin/env python3
"""
PDF Processing Bridge Script

This script serves as a bridge between the Node.js Express application and the Python PDF processor.
It provides a command-line interface to process PDF files and return structured JSON data.

Usage:
    python pdf_bridge.py extract <pdf_file_path> [--cache-dir=DIR] [--max-segments=N] [--no-cache] [--sentences]

Arguments:
    extract             Extract text from a PDF file
    <pdf_file_path>     Path to the PDF file to process

Options:
    --cache-dir=DIR     Directory to store cache files [default: ./uploads/cache]
    --max-segments=N    Maximum segments per batch [default: 50]
    --no-cache          Disable caching
    --sentences         Split text into sentences
"""

import sys
import os
import json
import argparse
from pdf_processor import PDFProcessor

def main():
    parser = argparse.ArgumentParser(description="PDF Processing Bridge")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Extract command
    extract_parser = subparsers.add_parser("extract", help="Extract text from PDF")
    extract_parser.add_argument("pdf_file", help="Path to the PDF file")
    extract_parser.add_argument("--cache-dir", default="./uploads/cache", help="Cache directory")
    extract_parser.add_argument("--max-segments", type=int, default=50, help="Max segments per batch")
    extract_parser.add_argument("--no-cache", action="store_true", help="Disable cache")
    extract_parser.add_argument("--sentences", action="store_true", help="Split into sentences")
    
    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Process extract command
    if args.command == "extract":
        # Ensure PDF file exists
        if not os.path.exists(args.pdf_file):
            print(json.dumps({"error": f"File not found: {args.pdf_file}"}))
            return
        
        # Ensure cache directory exists if using cache
        if not args.no_cache and not os.path.exists(args.cache_dir):
            try:
                os.makedirs(args.cache_dir, exist_ok=True)
            except Exception as e:
                print(json.dumps({"error": f"Failed to create cache directory: {str(e)}"}))
                return
        
        # Process the PDF
        try:
            processor = PDFProcessor(cache_dir=args.cache_dir if not args.no_cache else None)
            
            if args.sentences:
                # Process with sentence segmentation
                result = processor.batch_process_pdf(
                    args.pdf_file,
                    max_segments_per_batch=args.max_segments,
                    use_cache=not args.no_cache
                )
            else:
                # Simple extraction
                result = processor.extract_text_from_pdf(
                    args.pdf_file,
                    use_cache=not args.no_cache
                )
            
            # Print JSON result to stdout for the Node.js process to capture
            print(json.dumps(result))
            
        except Exception as e:
            print(json.dumps({"error": f"PDF processing failed: {str(e)}"}))

if __name__ == "__main__":
    # Add the current directory to the Python path so we can import the pdf_processor module
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()