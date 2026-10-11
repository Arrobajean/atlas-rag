-- Ejecutar una vez en Supabase > SQL Editor

create extension if not exists vector;

create table if not exists documents (
  id bigserial primary key,
  source text not null,          -- nombre del archivo de origen
  content text not null,         -- el fragmento de texto
  embedding vector(768) not null -- gemini-embedding-001 reducido a 768 dims
);

create index if not exists documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops);

alter table documents enable row level security;

-- Busca los fragmentos más parecidos a la pregunta
create or replace function match_documents(
  query_embedding vector(768),
  match_count int default 5
)
returns table (id bigint, source text, content text, similarity float)
language sql stable
as $$
  select id, source, content, 1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
