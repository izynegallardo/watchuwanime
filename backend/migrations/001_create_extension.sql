create schema if not exists extensions;

-- CASCADE also drops anything already using the vector type (the anime
-- table's embedding column, match_anime()) - harmless here since 002/003
-- unconditionally drop-and-recreate those on every migration run anyway.
-- Dropping and recreating the extension fresh every run, rather than trying
-- to detect and relocate an already-existing install, avoids depending on
-- exactly which schema Postgres happened to put it in initially.
drop extension if exists vector cascade;

create extension vector with schema extensions;

-- Match Supabase's actual default search_path so unqualified operators/
-- opclasses (like <=> in match_anime, see 003) resolve the same way locally
-- as they do in production. Only affects NEW connections made after this
-- runs - see the explicit SET search_path in 003 for why that file also
-- needs its own session-level SET.
do $$
begin
  execute format(
    'alter database %I set search_path to %s',
    current_database(),
    '"$user", public, extensions'
  );
end
$$;