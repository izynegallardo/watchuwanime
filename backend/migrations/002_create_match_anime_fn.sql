drop function if exists match_anime(extensions.vector(384), float, int, bigint[]);

create or replace function match_anime (
  query_embedding extensions.vector(384),
  match_threshold float,
  match_count int,
  exclude_ids bigint[] default '{}'
)
returns table (
  id bigint,
  title text,
  title_english text,
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
  total_minutes integer,
  embedding extensions.vector(384),
  similarity float
)
language sql stable
as $$
  select
    anime.id, anime.title, anime.title_english, anime.type, anime.year, anime.genres,
    anime.synopsis, anime.rating, anime.score, anime.popularity, anime.status, anime.is_airing,
    anime.image_url, anime.duration_minutes, anime.episodes, anime.total_minutes,
    anime.embedding,
    1 - (anime.embedding <=> query_embedding) as similarity
  from anime
  where 1 - (anime.embedding <=> query_embedding) > match_threshold
    and anime.id <> all(exclude_ids)
  order by (anime.embedding <=> query_embedding) asc
  limit match_count;
$$;
