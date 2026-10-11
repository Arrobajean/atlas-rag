"""Pregunta a tus documentos.

Uso: python ask.py "¿tu pregunta?"   (o sin argumentos para modo interactivo)
"""
import sys

from google.genai import types

from rag import CHAT_MODEL, embed, gemini, supabase

TOP_K = 5

SYSTEM = (
    "Responde en español usando SOLO el contexto proporcionado. "
    "Si la respuesta no está en el contexto, dilo claramente. "
    "Cita la fuente entre corchetes, por ejemplo [archivo.md]."
)


def ask(question: str) -> str:
    [query_vec] = embed([question], "RETRIEVAL_QUERY")
    matches = supabase.rpc(
        "match_documents", {"query_embedding": query_vec, "match_count": TOP_K}
    ).execute().data

    context = "\n\n".join(f"[{m['source']}]\n{m['content']}" for m in matches)
    import time
    for attempt in range(3):
        try:
            resp = gemini.models.generate_content(
                model=CHAT_MODEL,
                contents=f"Contexto:\n{context}\n\nPregunta: {question}",
                config=types.GenerateContentConfig(system_instruction=SYSTEM),
            )
            return resp.text
        except Exception as e:
            if "503" in str(e) and attempt < 2:
                time.sleep(2)
                continue
            raise e


if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(ask(" ".join(sys.argv[1:])))
    else:
        while (q := input("\nPregunta (vacío para salir): ").strip()):
            print("\n" + ask(q))
