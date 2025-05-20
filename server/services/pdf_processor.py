import fitz  # PyMuPDF
import os
import re
import time
import hashlib
from typing import List, Dict, Tuple, Optional, Union, Any

class PDFProcessor:
    """
    A faster PDF processing service using PyMuPDF (fitz) for text extraction and segmentation.
    
    This class handles:
    - Fast PDF text extraction
    - Text segmentation with natural paragraph boundaries
    - Position tracking for better layout awareness
    - Caching to avoid redundant processing
    """
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        Initialize the PDF processor
        
        Args:
            cache_dir: Directory to store cache files (default: None - no caching)
        """
        self.cache_dir = cache_dir
        if cache_dir and not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
    
    def get_file_hash(self, file_path: str) -> str:
        """
        Calculate MD5 hash of a file for caching purposes
        
        Args:
            file_path: Path to the file
            
        Returns:
            str: MD5 hash of the file
        """
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def extract_text_from_pdf(
        self, 
        file_path: str, 
        start_page: int = 0,
        end_page: int = -1,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Extract text from PDF with page position data
        
        Args:
            file_path: Path to the PDF file
            start_page: Starting page number (0-indexed)
            end_page: Ending page number (-1 for all pages)
            use_cache: Whether to use cached results if available
            
        Returns:
            Dict with:
                - segments: List of extracted text segments
                - metadata: Dict containing file info and processing stats
        """
        result = {
            "segments": [],
            "metadata": {
                "fileName": os.path.basename(file_path),
                "pageCount": 0,
                "processingTimeMs": 0,
                "extractionMethod": "PyMuPDF",
            }
        }
        
        # Check cache if enabled
        if use_cache and self.cache_dir:
            file_hash = self.get_file_hash(file_path)
            cache_path = os.path.join(self.cache_dir, f"{file_hash}.cached")
            if os.path.exists(cache_path):
                try:
                    with open(cache_path, "r", encoding="utf-8") as f:
                        import json
                        cached_data = json.load(f)
                        # Add cache info to metadata
                        cached_data["metadata"]["fromCache"] = True
                        return cached_data
                except Exception as e:
                    print(f"Error loading cache: {e}")
        
        start_time = time.time()
        
        try:
            doc = fitz.open(file_path)
            result["metadata"]["pageCount"] = len(doc)
            
            if end_page == -1 or end_page >= len(doc):
                end_page = len(doc) - 1
                
            # Process each page and extract text
            all_blocks = []
            
            for page_num in range(start_page, end_page + 1):
                page = doc[page_num]
                # Extract page content in dict format
                # PyMuPDF's Page class has a get_text method that can output in different formats
                # "dict" returns a hierarchical structure with blocks, lines, spans
                page_text = page.get_text("dict")
                blocks = page_text.get("blocks", [])
                
                # Add page information to blocks
                for block in blocks:
                    block["page"] = page_num
                    all_blocks.append(block)
            
            # Extract and clean segments
            segments = self._process_blocks(all_blocks)
            result["segments"] = segments
            
            # Close the document
            doc.close()
            
            # Save to cache if enabled
            if use_cache and self.cache_dir:
                try:
                    file_hash = self.get_file_hash(file_path)
                    cache_path = os.path.join(self.cache_dir, f"{file_hash}.cached")
                    with open(cache_path, "w", encoding="utf-8") as f:
                        import json
                        json.dump(result, f, ensure_ascii=False, indent=2)
                except Exception as e:
                    print(f"Error saving to cache: {e}")
            
        except Exception as e:
            result["error"] = str(e)
            
        end_time = time.time()
        result["metadata"]["processingTimeMs"] = int((end_time - start_time) * 1000)
        
        return result
    
    def _process_blocks(self, blocks: List[Dict]) -> List[Dict]:
        """
        Process and convert blocks into clean text segments
        
        Args:
            blocks: List of text blocks extracted from PDF
            
        Returns:
            List of text segments with metadata
        """
        segments = []
        segment_id = 0
        
        # Group blocks by page
        pages = {}
        for block in blocks:
            page_num = block.get("page", 0)
            if page_num not in pages:
                pages[page_num] = []
            pages[page_num].append(block)
        
        # Process each page
        for page_num in sorted(pages.keys()):
            page_blocks = pages[page_num]
            
            # Sort blocks by vertical position (top to bottom)
            page_blocks.sort(key=lambda b: b["bbox"][1])
            
            for block in page_blocks:
                if block.get("type") != 0:  # Skip non-text blocks
                    continue
                
                lines = []
                for line in block.get("lines", []):
                    line_text = ""
                    for span in line.get("spans", []):
                        line_text += span.get("text", "")
                    if line_text.strip():
                        lines.append(line_text)
                
                if not lines:
                    continue
                
                # Join lines into a single text block
                text = " ".join(lines)
                text = text.strip()
                
                if not text:
                    continue
                
                # Skip if it looks like a header, footer, or page number
                if re.match(r"^\d+$", text) or len(text) < 5:
                    continue
                
                # Create segment
                segment = {
                    "id": segment_id,
                    "source": text,
                    "page": page_num + 1,  # 1-indexed for user display
                    "bbox": block["bbox"],
                    "position": {
                        "x": block["bbox"][0],
                        "y": block["bbox"][1],
                        "width": block["bbox"][2] - block["bbox"][0],
                        "height": block["bbox"][3] - block["bbox"][1]
                    }
                }
                
                segments.append(segment)
                segment_id += 1
        
        return segments
    
    def segment_into_sentences(self, segments: List[Dict]) -> List[Dict]:
        """
        Further segment blocks of text into sentences
        
        Args:
            segments: List of text segments
            
        Returns:
            List of sentence-level segments
        """
        sentence_segments = []
        segment_id = 0
        
        sentence_pattern = re.compile(r'(?<=[.!?])\s+(?=[A-Z가-힣])')
        
        for segment in segments:
            text = segment["source"]
            
            # Split text into sentences
            sentences = sentence_pattern.split(text)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            # Keep original if no sentence breaks found
            if not sentences:
                segment["id"] = segment_id
                sentence_segments.append(segment)
                segment_id += 1
                continue
            
            # Create new segments for each sentence
            for sentence in sentences:
                new_segment = segment.copy()
                new_segment["id"] = segment_id
                new_segment["source"] = sentence
                new_segment["original_segment_id"] = segment["id"]
                sentence_segments.append(new_segment)
                segment_id += 1
        
        return sentence_segments
    
    def batch_process_pdf(
        self, 
        file_path: str,
        max_segments_per_batch: int = 10,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Process a PDF file in batches for better performance
        
        Args:
            file_path: Path to the PDF file
            max_segments_per_batch: Maximum segments to process per batch
            use_cache: Whether to use cached results
            
        Returns:
            Dict with extraction results
        """
        result = self.extract_text_from_pdf(file_path, use_cache=use_cache)
        
        # Further segment into sentences
        if not result.get("error"):
            result["segments"] = self.segment_into_sentences(result["segments"])
        
        # Add batch info
        result["batches"] = []
        segments = result["segments"]
        
        # Create batches
        for i in range(0, len(segments), max_segments_per_batch):
            batch = segments[i:i + max_segments_per_batch]
            batch_info = {
                "batchId": len(result["batches"]),
                "startSegmentId": batch[0]["id"] if batch else 0,
                "endSegmentId": batch[-1]["id"] if batch else 0,
                "segmentCount": len(batch)
            }
            result["batches"].append(batch_info)
        
        # For the initial response, only return the first batch of segments
        if result["batches"]:
            first_batch = result["batches"][0]
            result["initialSegments"] = segments[
                first_batch["startSegmentId"]:first_batch["endSegmentId"] + 1
            ]
            
        # Add additional metadata
        result["metadata"]["totalSegments"] = len(segments)
        result["metadata"]["batchCount"] = len(result["batches"])
        
        return result