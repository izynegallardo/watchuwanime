create table anime (
  id bigserial primary key,
  mal_id integer unique not null,
  title text not null,
  title_english text,
  title_japanese text,
  type text,
  year integer,
  genres text[],
  synopsis text,
  rating text,
  score numeric,
  popularity integer,
  status text,
  is_airing boolean,
  image_url text,
  duration_minutes integer,
  episodes integer,
  total_minutes integer generated always as (duration_minutes * coalesce(episodes, 1)) stored,
  content text not null,
  embedding vector(384) -- all-MiniLM-L6-v2 outputs 384 dimensions
);

SET maintenance_work_mem = '512MB';

create index on anime using hnsw (embedding vector_cosine_ops);