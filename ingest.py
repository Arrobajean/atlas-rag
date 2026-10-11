"""Lee los archivos de docs/, los trocea, genera embeddings y los guarda en Supabase.

Uso: python ingest.py
"""
from pathlib import Path

from pypdf import PdfReader

from rag import embed, supabase

DOCS_DIR = Path(__file__).parent / "docs"
CHUNK_SIZE = 1000  # caracteres por fragmento
OVERLAP = 200      # solape para no cortar ideas por la mitad


def read_file(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
    return path.read_text(encoding="utf-8")


def chunk(text: str) -> list[str]:
    text = " ".join(text.split())
    step = CHUNK_SIZE - OVERLAP
    return [text[i : i + CHUNK_SIZE] for i in range(0, len(text), step) if text[i : i + CHUNK_SIZE].strip()]


def main():
    files = [p for p in DOCS_DIR.iterdir() if p.suffix.lower() in {".txt", ".md", ".pdf"}]
    if not files:
        print(f"No hay archivos .txt, .md o .pdf en {DOCS_DIR}")
        return

    for path in files:
        chunks = chunk(read_file(path))
        if not chunks:
            continue
        # Reindexar un archivo reemplaza sus fragmentos anteriores
        supabase.table("documents").delete().eq("source", path.name).execute()
        vectors = embed(chunks, "RETRIEVAL_DOCUMENT")
        rows = [{"source": path.name, "content": c, "embedding": v} for c, v in zip(chunks, vectors)]
        supabase.table("documents").insert(rows).execute()
        print(f"{path.name}: {len(chunks)} fragmentos")


if __name__ == "__main__":
    main()
