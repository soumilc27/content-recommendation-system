from __future__ import annotations

from functools import lru_cache
import json
import re
from typing import Iterable
from urllib import error, request

from app.core.settings import get_settings
from app.services.movie_catalog import lookup_movie_metadata


def _fallback_summary(seed_title: str | None, mood: str | None, recommendations: Iterable[dict]) -> str:
    titles = [item.get('title') for item in list(recommendations)[:3] if item.get('title')]
    if seed_title and titles:
        joined = ', '.join(titles)
        return f"Based on {seed_title}, the strongest matches here are {joined}. They share overlapping themes, genres, or viewing appeal."
    if mood and titles:
        joined = ', '.join(titles)
        return f"For a {mood} mood, these picks lean toward {joined} and similar films with the same energy."
    if titles:
        return f"Top current picks include {', '.join(titles)}."
    return 'No AI summary available yet.'


def _build_prompt(seed_title: str | None, mood: str | None, recommendations: Iterable[dict]) -> str:
    lines = []
    for item in list(recommendations)[:6]:
        lines.append(
            f"- {item.get('title', 'Untitled')} | score={item.get('score', 0):.3f} | explanation={item.get('explanation', '')}"
        )

    rec_block = '\n'.join(lines) if lines else '- No recommendations available'
    context_parts = [
        'You are a concise movie recommendation assistant.',
        'Write 2 short sentences max.',
        'Do not use markdown or bullet points.',
        'Mention why the list fits the seed or mood in plain language.',
    ]
    if seed_title:
        context_parts.append(f"Seed title: {seed_title}")
    if mood:
        context_parts.append(f"Mood: {mood}")
    context_parts.append(f"Recommendations:\n{rec_block}")
    return '\n'.join(context_parts)


@lru_cache(maxsize=128)
def _generate_text_cached(
    model_name: str,
    api_key: str,
    endpoint: str,
    timeout_seconds: int,
    prompt: str,
    max_output_tokens: int,
) -> str:
    payload = {
        'model': model_name,
        'messages': [
            {
                'role': 'user',
                'content': prompt,
            }
        ],
        'temperature': 0.35,
        'max_tokens': max_output_tokens,
    }
    req = request.Request(
        endpoint,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
        method='POST',
    )

    try:
        with request.urlopen(req, timeout=timeout_seconds) as resp:
            response_data = json.loads(resp.read().decode('utf-8'))
    except error.HTTPError as e:
        print(f"Ollama/xAI Cloud API HTTPError: {e.code} - {e.read().decode('utf-8', errors='ignore') if hasattr(e, 'read') else ''}")
        return ''
    except error.URLError as e:
        print(f"Ollama/xAI Cloud API URLError: {e.reason}")
        return ''
    except TimeoutError:
        print("Ollama/xAI Cloud API TimeoutError")
        return ''

    choices = response_data.get('choices', [])
    if not choices:
        return ''

    message = choices[0].get('message', {})
    content = message.get('content', '')
    if isinstance(content, list):
        texts = []
        for part in content:
            if isinstance(part, dict) and part.get('text'):
                texts.append(part.get('text', ''))
            elif isinstance(part, str):
                texts.append(part)
        return ' '.join(texts).strip()
    if isinstance(content, str):
        return content.strip()
    return ''


def generate_text(prompt: str) -> str:
    settings = get_settings()
    
    # Priority 1: Ollama Cloud API (if OLLAMA_API_KEY is defined)
    if settings.ollama_api_key:
        endpoint = f"{settings.ollama_base_url.rstrip('/')}/chat/completions"
        return _generate_text_cached(
            settings.ollama_model,
            settings.ollama_api_key,
            endpoint,
            settings.xai_timeout_seconds,
            prompt,
            1000,
        )

    # Priority 2: x.ai (fallback)
    if settings.xai_api_key:
        endpoint = 'https://api.x.ai/v1/chat/completions'
        return _generate_text_cached(
            settings.xai_model,
            settings.xai_api_key,
            endpoint,
            settings.xai_timeout_seconds,
            prompt,
            1000,
        )

    return ''


def summarize_recommendations(seed_title: str | None, mood: str | None, recommendations: Iterable[dict]) -> str:
    items = list(recommendations)
    fallback = _fallback_summary(seed_title, mood, items)
    prompt = _build_prompt(seed_title, mood, items)
    generated = generate_text(prompt)
    return generated or fallback


def summarize_movie_detail(title: str, genres: str | None, recommendations: Iterable[dict]) -> str:
    items = list(recommendations)
    fallback = _fallback_summary(title, None, items)
    rec_lines = []
    for item in items[:5]:
        rec_lines.append(f"- {item.get('title', 'Untitled')} | {item.get('explanation', '')}")

    prompt = '\n'.join([
        'You are a concise movie guide.',
        'Write 2 short sentences max that explain the movie and why the related titles matter.',
        'Do not use markdown or bullets.',
        f"Movie: {title}",
        f"Genres: {genres or 'Unknown'}",
        'Related titles:',
        '\n'.join(rec_lines) if rec_lines else '- No related titles available',
    ])
    generated = generate_text(prompt)
    return generated or fallback


def _build_plot_fallback(title: str, genres: str | None, description: str | None) -> str:
    genre_list = [genre.strip() for genre in str(genres or '').split() if genre.strip()]
    display_title = title.strip().title() if title else 'This Movie'
    genre_phrase = ', '.join(genre_list[:4]).title() if genre_list else 'Broad Appeal'

    if description:
        clean_description = description.strip().rstrip('.').rstrip()
        if clean_description:
            return clean_description if clean_description.endswith('.') else f'{clean_description}.'

    opening = f'{display_title} is a {genre_phrase.lower()} film.' if genre_list else f'{display_title} is a film with broad appeal.'
    middle = (
        'No plot synopsis is stored for this title yet, but the genre mix suggests a story built around '
        'family-friendly stakes, recognizable characters, and an accessible tone.'
    )
    closing = 'Gemini can replace this with a richer plot paragraph once a valid API key is configured.'
    return f'{opening} {middle} {closing}'


def summarize_movie_plot(title: str, genres: str | None, description: str | None) -> str:
    prompt = '\n'.join([
        'You are a concise movie plot writer.',
        'Write exactly one paragraph with 3 to 4 sentences.',
        'Do not use markdown or bullet points.',
        'Describe the movie plot in a natural, engaging way using the title, genres, and any provided description.',
        'If the description is sparse, infer a safe high-level synopsis from the genres without inventing specific spoilers.',
        f'Movie: {title}',
        f'Genres: {genres or "Unknown"}',
        f'Description: {description or "Unavailable"}',
    ])
    return generate_text(prompt)


def _parse_genre_labels(genres: str | None) -> list[str]:
    raw = str(genres or '').strip()
    if not raw or raw.lower() in {'unknown', 'n/a', 'none'}:
        return []
    if '|' in raw:
        return [genre.strip() for genre in raw.split('|') if genre.strip()]
    return [genre.strip() for genre in raw.split() if genre.strip()]


def _is_deferred_insight(text: str) -> bool:
    if not text or not text.strip():
        return True
    lowered = text.lower()
    defer_phrases = (
        'add more',
        'once you add',
        'starting to build',
        'just starting',
        'more detailed taste',
        'more films with genres',
        'not enough movies',
        'need more movies',
        'save a few',
        'save more',
        'come back when',
        'when you add more',
        'further additions',
        'analysis is limited',
        'no discernible',
        'will reveal clearer',
        'absence of genre',
    )
    return any(phrase in lowered for phrase in defer_phrases)


def _resolved_watchlist_movie(item) -> tuple[object | dict, int | None]:
    movie = item.get('movie') if isinstance(item, dict) else None
    if movie is None and not isinstance(item, dict):
        movie = item
    elif movie is None:
        movie = item

    movie_id = None
    if isinstance(item, dict):
        movie_id = item.get('movie_id')
    if movie_id is None:
        movie_id = _movie_field(movie, 'movie_id')

    metadata = lookup_movie_metadata(int(movie_id)) if movie_id is not None else None
    if metadata:
        if isinstance(movie, dict):
            movie = {
                **movie,
                'title': movie.get('title') or metadata.get('title'),
                'genres': movie.get('genres') or metadata.get('genres'),
                'year': movie.get('year') or metadata.get('year'),
            }
        else:
            movie = {
                'title': _movie_field(movie, 'title') or metadata.get('title'),
                'genres': _movie_field(movie, 'genres') or metadata.get('genres'),
                'year': _movie_field(movie, 'year') or metadata.get('year'),
            }

    return movie, movie_id


def _movie_field(movie, field: str, default=None):
    if movie is None:
        return default
    if isinstance(movie, dict):
        return movie.get(field, default)
    return getattr(movie, field, default)


def summarize_taste_profile(watchlist: Iterable[dict]) -> str:
    items = list(watchlist)
    if not items:
        return 'Save a movie to your wishlist to generate a taste profile.'

    top_titles = []
    top_genres = []
    genre_counts: dict[str, int] = {}
    for item in items:
        movie, _movie_id = _resolved_watchlist_movie(item)

        title = _movie_field(movie, 'title') or (item.get('title') if isinstance(item, dict) else None)
        if title:
            top_titles.append(title)

        genres = str(_movie_field(movie, 'genres') or (item.get('genres') if isinstance(item, dict) else '') or '')
        for genre in _parse_genre_labels(genres):
            genre_counts[genre] = genre_counts.get(genre, 0) + 1

    for genre, _count in sorted(genre_counts.items(), key=lambda pair: pair[1], reverse=True)[:4]:
        top_genres.append(genre)

    fallback_titles = ', '.join(top_titles[:4]) if top_titles else 'your saved titles'
    fallback_genres = ', '.join(top_genres) if top_genres else 'a few broad themes'
    if len(items) == 1 and top_titles:
        fallback = (
            f'Your wishlist starts with {top_titles[0]}, which highlights {fallback_genres}. '
            'Add more titles anytime to sharpen this profile.'
        )
    else:
        fallback = (
            f'Your saved movies lean toward {fallback_genres}. '
            f'Titles like {fallback_titles} are shaping the profile right now.'
        )

    lines = []
    has_genre_signal = False
    for item in items[:10]:
        movie, _movie_id = _resolved_watchlist_movie(item)
        genres = _movie_field(movie, 'genres')
        if _parse_genre_labels(genres):
            has_genre_signal = True
        lines.append(
            f"- {_movie_field(movie, 'title', 'Untitled')} | genres={genres or 'Unknown'} | year={_movie_field(movie, 'year', 'Unknown')}"
        )

    if not has_genre_signal:
        return fallback

    prompt_parts = [
        'You are a concise movie taste analyst.',
        'Write exactly 2 short sentences.',
        'Do not use markdown or bullet points.',
        'Always analyze the saved movies provided below, even if there is only one title.',
        'Never tell the user to add more movies, wait, or come back later.',
        'Never say you need more data or more genres to produce an insight.',
        'Mention specific titles and genre patterns from the list.',
        'Saved movies:',
        '\n'.join(lines),
    ]
    generated = generate_text('\n'.join(prompt_parts))
    if _is_deferred_insight(generated):
        return fallback
    return generated or fallback


def _fallback_taste_word(genre_counts: dict[str, int]) -> str:
    archetypes = {
        'animation': 'Animator',
        'adventure': 'Explorer',
        'comedy': 'Jester',
        'drama': 'Storyteller',
        'romance': 'Romantic',
        'thriller': 'Suspenseist',
        'horror': 'Nightwatcher',
        'sci-fi': 'Futurist',
        'fantasy': 'Dreamer',
        'action': 'Adrenalist',
        'crime': 'Noirseeker',
        'mystery': 'Sleuth',
        'documentary': 'Realist',
        'war': 'Historian',
        'musical': 'Showman',
        'western': 'Ranger',
        'family': 'Heartlander',
    }
    if not genre_counts:
        return 'Cinephile'
    top_genre = max(genre_counts.items(), key=lambda pair: pair[1])[0].lower()
    return archetypes.get(top_genre, f'{top_genre.capitalize()}phile')


def _collect_watchlist_signals(watchlist: Iterable[dict]) -> tuple[dict[str, int], list[str]]:
    genre_counts: dict[str, int] = {}
    titles: list[str] = []
    for item in list(watchlist):
        movie, _movie_id = _resolved_watchlist_movie(item)
        title = _movie_field(movie, 'title') or (item.get('title') if isinstance(item, dict) else None)
        if title:
            titles.append(str(title))
        genres = str(_movie_field(movie, 'genres') or '')
        for genre in _parse_genre_labels(genres):
            key = genre.lower()
            genre_counts[key] = genre_counts.get(key, 0) + 1
    return genre_counts, titles


def explain_taste_word(word: str, watchlist: Iterable[dict]) -> str:
    genre_counts, titles = _collect_watchlist_signals(watchlist)
    cleaned = (word or '').strip().capitalize()
    if not cleaned:
        return 'Your taste archetype appears after you save movies to your wishlist.'

    meanings = {
        'Animator': 'a playful, animation-forward personality',
        'Explorer': 'an adventure-seeking viewer',
        'Jester': 'a comedy-first sense of humor',
        'Storyteller': 'a character-driven, drama-oriented taste',
        'Romantic': 'a romance-friendly viewing style',
        'Suspenseist': 'a suspense and thriller appetite',
        'Nightwatcher': 'a dark, horror-tolerant palate',
        'Futurist': 'a sci-fi and future-minded lens',
        'Dreamer': 'an imaginative, fantasy-friendly lens',
        'Adrenalist': 'a high-energy action preference',
        'Noirseeker': 'a crime and noir curiosity',
        'Sleuth': 'a mystery-loving mindset',
        'Realist': 'a grounded, documentary-leaning taste',
        'Historian': 'a history and war-story interest',
        'Showman': 'a musical and spectacle-friendly taste',
        'Ranger': 'a western and frontier-story pull',
        'Heartlander': 'a warm, family-oriented comfort zone',
        'Cinephile': 'a broad love of cinema overall',
        'Whimsical': 'a light, playful, feel-good tilt',
        'Adventurer': 'a bold, journey-driven appetite',
        'Playful': 'a lighthearted, fun-first viewing mood',
        'Thrillseeker': 'a high-tension, adrenaline-friendly taste',
        'Romantist': 'a romance and emotional-story preference',
        'Noirphile': 'a moody crime-and-mystery attraction',
    }

    meaning = meanings.get(cleaned, 'a personalized shorthand for your movie personality')
    genre_hint = ', '.join(
        genre.capitalize()
        for genre, _count in sorted(genre_counts.items(), key=lambda pair: pair[1], reverse=True)[:4]
    ) or 'the genres in your saves'
    title_hint = ', '.join(titles[:3]) or 'your saved titles'

    return (
        f'"{cleaned}" means {meaning}. We chose it because your wishlist leans toward '
        f'{genre_hint}, especially in titles like {title_hint}.'
    )


def generate_taste_word(watchlist: Iterable[dict]) -> str:
    items = list(watchlist)
    if not items:
        return ''

    genre_counts, titles = _collect_watchlist_signals(items)
    fallback = _fallback_taste_word(genre_counts)
    if not genre_counts and not titles:
        return fallback

    genre_hint = ', '.join(
        genre for genre, _count in sorted(genre_counts.items(), key=lambda pair: pair[1], reverse=True)[:5]
    )
    title_hint = ', '.join(titles[:6])

    prompt = '\n'.join([
        'You label a movie viewer with exactly one taste archetype word.',
        'Return only one English word.',
        'No spaces, no punctuation, no explanation, no markdown.',
        'The word should feel creative and related to their saved movie taste.',
        'Examples: Dreamer, Thrillseeker, Romantist, Adventurer, Noirphile.',
        f'Top genres: {genre_hint or "unknown"}',
        f'Saved titles: {title_hint or "unknown"}',
    ])
    generated = generate_text(prompt)
    if not generated:
        return fallback

    candidate = re.sub(r'[^A-Za-z]', '', generated.strip().split()[0])
    if len(candidate) < 3 or len(candidate) > 20:
        return fallback
    return candidate.capitalize()
