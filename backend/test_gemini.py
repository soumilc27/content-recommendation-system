import sys
from app.services.gemini import generate_text, summarize_movie_plot

print('Testing generate_text...')
try:
    out = generate_text('Say hello in one sentence.')
    print('generate_text output:')
    print(out)
except Exception as e:
    print('generate_text exception:', e)

print('\nTesting summarize_movie_plot...')
try:
    out2 = summarize_movie_plot('Toy Story', 'Animation|Family|Comedy', None)
    print('summarize_movie_plot output:')
    print(out2)
except Exception as e:
    print('summarize_movie_plot exception:', e)

# Also print settings to confirm key is loaded (redact in output)
from app.core.settings import get_settings
s = get_settings()
print('\nSettings loaded:')
print('xai_model=', s.xai_model)
print('xai_timeout_seconds=', s.xai_timeout_seconds)
print('xai_api_key set=', bool(s.xai_api_key))
