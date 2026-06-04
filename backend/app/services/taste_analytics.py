from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any

from app.services.gemini import _parse_genre_labels
from app.services.movie_catalog import lookup_movie_metadata

_TWO_WORD_NAME = re.compile(r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b')


def _extract_people_names(text: str | None, limit: int = 40) -> list[str]:
    if not text or str(text).strip().lower() in {'nan', 'none', ''}:
        return []
    raw = str(text)
    found: list[str] = []
    seen = set()
    pos = 0

    while pos < len(raw) and len(found) < limit:
        match = _TWO_WORD_NAME.search(raw, pos)
        if not match:
            break
        name = match.group(0)
        key = name.lower()
        if key not in seen:
            seen.add(key)
            found.append(name)
        pos = match.end()

    return found


def _movie_catalog_fields(item: dict) -> dict[str, Any]:
    movie = item.get('movie') if isinstance(item.get('movie'), dict) else item
    movie_id = item.get('movie_id') or (movie or {}).get('movie_id')
    catalog = lookup_movie_metadata(int(movie_id)) if movie_id is not None else None
    merged = {**(movie or {})}
    if catalog:
        for field in ('title', 'genres', 'year', 'directors', 'actors'):
            if not merged.get(field) and catalog.get(field):
                merged[field] = catalog[field]
    return merged


def _format_genre_list(genre_counts: Counter, limit: int = 4) -> str:
    if not genre_counts:
        return 'your saved genres'
    labels = [
        genre.capitalize()
        for genre, _count in sorted(genre_counts.items(), key=lambda pair: pair[1], reverse=True)[:limit]
    ]
    if len(labels) == 1:
        return labels[0]
    return ', '.join(labels[:-1]) + f' and {labels[-1]}'


def _diversity_explanation(label: str, score: float, unique: int, saved_count: int, genre_counts: Counter) -> str:
    genre_hint = _format_genre_list(genre_counts)
    if label == 'Unknown':
        return 'We cannot score diversity until your saved movies include genre data.'

    if label == 'Focused':
        return (
            f'Focused means your saves cluster around a narrow set of genres ({genre_hint}). '
            f'We labeled you Focused because your diversity score is {int(round(score * 100))}% across '
            f'{unique} unique genres from {saved_count} saved {"title" if saved_count == 1 else "titles"}.'
        )

    if label == 'Balanced':
        return (
            f'Balanced means you mix genres without leaning too narrow or too wide ({genre_hint}). '
            f'We labeled you Balanced because your diversity score is {int(round(score * 100))}% across '
            f'{unique} unique genres from {saved_count} saved {"title" if saved_count == 1 else "titles"}.'
        )

    return (
        f'Eclectic means you spread saves across many different genres ({genre_hint}). '
        f'We labeled you Eclectic because your diversity score is {int(round(score * 100))}% across '
        f'{unique} unique genres from {saved_count} saved {"title" if saved_count == 1 else "titles"}.'
    )


def _genre_diversity(genre_counts: Counter, saved_count: int = 0) -> dict[str, Any]:
    total = sum(genre_counts.values())
    unique = len(genre_counts)

    if total == 0:
        return {
            'score': 0.0,
            'label': 'Unknown',
            'unique_genres': 0,
            'explanation': _diversity_explanation('Unknown', 0.0, 0, saved_count, genre_counts),
        }

    if unique <= 1:
        score = 0.0
        label = 'Focused'
        return {
            'score': score,
            'label': label,
            'unique_genres': unique,
            'explanation': _diversity_explanation(label, score, unique, saved_count, genre_counts),
        }

    probabilities = [count / total for count in genre_counts.values()]
    entropy = -sum(p * math.log(p) for p in probabilities if p > 0)
    max_entropy = math.log(unique)
    score = round(entropy / max_entropy, 2) if max_entropy > 0 else 0.0

    if score < 0.45:
        label = 'Focused'
    elif score < 0.75:
        label = 'Balanced'
    else:
        label = 'Eclectic'

    return {
        'score': score,
        'label': label,
        'unique_genres': unique,
        'explanation': _diversity_explanation(label, score, unique, saved_count, genre_counts),
    }


def _decade_breakdown(years: list[int]) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    for year in years:
        if year is None:
            continue
        try:
            decade = int(year) // 10 * 10
        except (TypeError, ValueError):
            continue
        counts[f'{decade}s'] += 1

    return [
        {'decade': decade, 'count': count}
        for decade, count in sorted(counts.items(), key=lambda pair: pair[0])
    ]


def _top_people_matches(items: list[dict], field: str, top_n: int = 5) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    for item in items:
        merged = _movie_catalog_fields(item)
        raw = merged.get(field)
        for name in _extract_people_names(raw):
            counts[name] += 1

    ranked = [{'name': name, 'count': count} for name, count in counts.most_common() if count > 0]
    overlap = [entry for entry in ranked if entry['count'] >= 2]
    return (overlap or ranked)[:top_n]


def compute_taste_metrics(watchlist: list[dict]) -> dict[str, Any]:
    items = list(watchlist)
    if not items:
        return {
            'genre_diversity': {
                'score': 0.0,
                'label': 'Unknown',
                'unique_genres': 0,
                'explanation': _diversity_explanation('Unknown', 0.0, 0, 0, Counter()),
            },
            'decade_breakdown': [],
            'top_directors': [],
            'top_actors': [],
            'saved_count': 0,
        }

    genre_counts: Counter[str] = Counter()
    years: list[int] = []

    for item in items:
        merged = _movie_catalog_fields(item)
        for genre in _parse_genre_labels(merged.get('genres')):
            genre_counts[genre.lower()] += 1
        year = merged.get('year')
        if year is not None:
            try:
                years.append(int(year))
            except (TypeError, ValueError):
                pass

    return {
        'genre_diversity': _genre_diversity(genre_counts, saved_count=len(items)),
        'decade_breakdown': _decade_breakdown(years),
        'top_directors': _top_people_matches(items, 'directors'),
        'top_actors': _top_people_matches(items, 'actors'),
        'saved_count': len(items),
    }
