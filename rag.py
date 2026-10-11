"""Piezas compartidas: clientes de Gemini y Supabase, y la función de embeddings."""
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client

load_dotenv()

EMBED_MODEL = "gemini-embedding-001"
EMBED_DIMS = 768
CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-flash-latest")

gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def embed(texts: list[str], task_type: str) -> list[list[float]]:
    """task_type: RETRIEVAL_DOCUMENT al indexar, RETRIEVAL_QUERY al preguntar."""
    vectors = []
    for i in range(0, len(texts), 100):  # la API acepta hasta 100 textos por llamada
        res = gemini.models.embed_content(
            model=EMBED_MODEL,
            contents=texts[i : i + 100],
            config=types.EmbedContentConfig(
                task_type=task_type, output_dimensionality=EMBED_DIMS
            ),
        )
        vectors.extend(e.values for e in res.embeddings)
    return vectors
