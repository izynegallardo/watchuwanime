drop table if exists anime;

create table anime (
  id bigserial primary key,
  pahe_id text unique not null,
  title text not null,
  title_romaji text,
  title_japanese text,
  title_spanish text,
  title_french text,
  synonyms text[],
  type text,
  aired_from date,
  aired_to date,
  year integer generated always as (extract(year from aired_from)::int) stored,
  season text,
  genres text[],
  themes text[],
  demographics text[],
  studios text[],
  summary text,
  status text,
  is_airing boolean,
  image_url text,
  youtube_url text,
  external_links jsonb,
  relations jsonb,
  recommendations jsonb,
  duration_minutes integer,
  episodes integer,
  total_minutes integer generated always as (duration_minutes * coalesce(episodes, 1)) stored,
  content text not null,
  embedding vector(384) -- all-MiniLM-L6-v2 outputs 384 dimensions
);

SET maintenance_work_mem = '512MB';

create index on anime using hnsw (embedding vector_cosine_ops);
create index on anime using gin (genres);