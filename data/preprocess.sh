
echo 'corpus.json'
q -H -d, '
  SELECT DISTINCT p.id, m.move_id
  FROM raw/pokemon.csv AS p
    INNER JOIN raw/pokemon_moves.csv AS m
    ON p.id = m.pokemon_id
  WHERE p.id < 10000
    AND m.move_id IN (
      SELECT move_id
      FROM raw/pokemon_moves.csv
      GROUP BY move_id
      HAVING COUNT(DISTINCT pokemon_id) BETWEEN 2 AND 900
    )' \
| jq -s -R '
  split("\n")
  | map(split(",") | select(length > 1) | map(tonumber))
  | map({
    "document": (.[0] - 1),
    "word": (.[1] - 1)
  })' \
> corpus2.json

exit

echo 'moves.json'
q -H -d, '
  SELECT m.id, n.name, t.name
  FROM raw/move_names.csv AS n
    INNER JOIN raw/moves.csv AS m
    ON m.id = n.move_id
    INNER JOIN raw/type_names.csv AS t
    ON t.type_id = m.type_id
  WHERE n.local_language_id = 1
    AND t.local_language_id = 1
    AND m.id < 10000' \
| jq -s -R '
  split("\n")
  | map(split(",") | select(length > 1))
  | map({
    "id": .[0] | tonumber,
    "name": .[1],
    "type": .[2]
  })' \
> moves.json

echo 'pokemons.json'
q -H -d, '
  SELECT p.id, s.name, tn.name
  FROM raw/pokemon.csv AS p
    INNER JOIN raw/pokemon_species_names.csv AS s
    ON p.id = s.pokemon_species_id
    INNER JOIN raw/pokemon_types.csv AS t
    ON p.id = t.pokemon_id
    INNER JOIN raw/type_names.csv AS tn
    ON tn.type_id = t.type_id
  WHERE s.local_language_id = 1
    AND tn.local_language_id = 1
    AND p.id < 10000' \
| jq -s -R '
  split("\n")
  | map(split(",") | select(length > 1))
  | map({
    "id": .[0] | tonumber,
    "name": .[1],
    "type": .[2]
  })
  | group_by(.id)
  | map({
    "id": .[0].id,
    "name": .[0].name,
    "type": map(.type)
  })'　\
> pokemons.json
