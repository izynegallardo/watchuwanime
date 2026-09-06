drop function if exists match_anime(extensions.vector(384), float, int, bigint[], text[]);

create or replace function match_anime (
  query_embedding extensions.vector(384),
  match_threshold float,
  match_count int,
  exclude_ids bigint[] default '{}',
  exclude_genres text[] default '{}'
)
returns table (
  id bigint,
  pahe_id text,
  title text,
  title_romaji text,
  title_japanese text,
  title_spanish text,
  title_french text,
  synonyms text[],
  type text,
  aired_from date,
  aired_to date,
  year integer,
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
  total_minutes integer,
  embedding extensions.vector(384),
  similarity float
)
language sql stable
as $$
  select
    anime.id, anime.pahe_id, anime.title, anime.title_romaji, anime.title_japanese,
    anime.title_spanish, anime.title_french, anime.synonyms, anime.type, anime.aired_from,
    anime.aired_to, anime.year, anime.season, anime.genres, anime.themes, anime.demographics,
    anime.studios, anime.summary, anime.status, anime.is_airing, anime.image_url,
    anime.youtube_url, anime.external_links, anime.relations, anime.recommendations,
    anime.duration_minutes, anime.episodes, anime.total_minutes,
    anime.embedding,
    1 - (anime.embedding <=> query_embedding) as similarity
  from anime
  where 1 - (anime.embedding <=> query_embedding) > match_threshold
    and anime.id <> all(exclude_ids)
    and not (anime.genres && exclude_genres)
  order by (anime.embedding <=> query_embedding) asc
  limit match_count;
$$;
