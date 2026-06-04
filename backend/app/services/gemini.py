from __future__ import annotations

from functools import lru_cache
import json
from typing import Iterable
from urllib import error, request

from app.core.settings import get_settings


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


def summarize_taste_profile(watchlist: Iterable[dict]) -> str:
    items = list(watchlist)
    if not items:
        return 'Save a few movies first and I will generate a taste profile.'

    top_titles = []
    top_genres = []
    genre_counts: dict[str, int] = {}
    for item in items:
        movie = item.get('movie') or item
        title = movie.get('title') or item.get('title')
        if title:
            top_titles.append(title)

        genres = str(movie.get('genres') or item.get('genres') or '')
        for genre in genres.split('|'):
            genre = genre.strip()
            if not genre:
                continue
            genre_counts[genre] = genre_counts.get(genre, 0) + 1

    for genre, _count in sorted(genre_counts.items(), key=lambda pair: pair[1], reverse=True)[:4]:
        top_genres.append(genre)

    fallback_titles = ', '.join(top_titles[:4]) if top_titles else 'your saved titles'
    fallback_genres = ', '.join(top_genres) if top_genres else 'a few broad themes'
    fallback = (
        f'Your saved movies lean toward {fallback_genres}. '
        f'Titles like {fallback_titles} are shaping the profile right now.'
    )

    lines = []
    for item in items[:10]:
        movie = item.get('movie') or item
        lines.append(
            f"- {movie.get('title', 'Untitled')} | genres={movie.get('genres', 'Unknown')} | year={movie.get('year', 'Unknown')}"
        )

    prompt = '\n'.join([
        'You are a concise movie taste analyst.',
        'Write 2 short sentences max.',
        'Do not use markdown or bullet points.',
        'Summarize the viewing pattern, mention the strongest genres if they are obvious, and keep it friendly.',
        'Saved movies:',
        '\n'.join(lines),
    ])
    generated = generate_text(prompt)
    return generated or fallback
