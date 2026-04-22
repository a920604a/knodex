import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.services.ingestion_service import CHUNK_SIZE, _chunk_tokens, _clean_text, ENCODING


def test_clean_text_removes_control_chars():
    dirty = "Hello\x00World\x07!"
    assert _clean_text(dirty) == "HelloWorld!"


def test_clean_text_collapses_newlines():
    text = "line1\n\n\n\nline2"
    assert _clean_text(text) == "line1\n\nline2"


def test_chunk_short_text_single_chunk():
    tokens = ENCODING.encode("short text")
    chunks = _chunk_tokens(tokens)
    assert len(chunks) == 1


def test_chunk_long_text_multiple_chunks():
    long_text = " ".join(["word"] * (CHUNK_SIZE * 2))
    tokens = ENCODING.encode(long_text)
    chunks = _chunk_tokens(tokens)
    assert len(chunks) > 1
    assert all(len(c) <= CHUNK_SIZE for c in chunks)


def test_chunk_overlap():
    tokens = list(range(CHUNK_SIZE + 50))
    chunks = _chunk_tokens(tokens)
    assert len(chunks) == 2
    # Second chunk should start 400 tokens into the first (500 - 100 overlap)
    assert chunks[1][0] == tokens[CHUNK_SIZE - 100]
