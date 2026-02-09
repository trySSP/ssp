from __future__ import annotations

from io import BytesIO
from pypdf import PdfReader


def extract_pdf_text(file_bytes: bytes) -> str:
    if not file_bytes:
        return ""

    reader = PdfReader(BytesIO(file_bytes))
    extracted_pages: list[str] = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text:
            extracted_pages.append(page_text)

    return "\n".join(extracted_pages)
