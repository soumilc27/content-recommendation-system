import pandas as pd


def load_movielens(path: str):
    """Load the Movielens CSV and return a DataFrame.

    path: path to movielens_100k.csv in this repo (e.g. 'movielens_100k.csv/movielens_100k.csv')
    """
    df = pd.read_csv(path)
    return df


def basic_preprocess(df: pd.DataFrame):
    """Basic cleaning used by the starter pipeline."""
    # drop rows where all of directors, actors, genres are NaN
    if {'directors','actors','genres'}.issubset(df.columns):
        df = df.dropna(subset=['directors','actors','genres'], how='all').reset_index(drop=True)
        df = df.fillna('')
    # lowercase titles
    if 'title' in df.columns:
        df['title'] = df['title'].astype(str)
    return df
