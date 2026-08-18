"""
Database connection helper.

Reads connection settings from environment variables so nobody needs to
hardcode credentials. Defaults match a typical local Postgres install.
"""
import os
from dotenv import load_dotenv
import psycopg2
import psycopg2.extras

load_dotenv()  # reads .env from the current working directory into os.environ

DB_CONFIG = {
    "host": os.environ.get("PG_HOST", "localhost"),
    "port": os.environ.get("PG_PORT", "5432"),
    "dbname": os.environ.get("PG_DATABASE", "adherence_warehouse"),
    "user": os.environ.get("PG_USER", "postgres"),
    "password": os.environ.get("PG_PASSWORD", "postgres"),
}


def get_connection():
    """Return a new psycopg2 connection. Caller is responsible for closing it."""
    return psycopg2.connect(**DB_CONFIG)


def query(sql, params=None, fetch=True):
    """
    Run a query and optionally fetch results as a list of dicts.
    Commits automatically for INSERT/UPDATE/DELETE.
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params or ())
            if fetch and cur.description is not None:
                rows = cur.fetchall()
            else:
                rows = None
            conn.commit()
            return rows
    finally:
        conn.close()


def query_one(sql, params=None):
    rows = query(sql, params, fetch=True)
    return rows[0] if rows else None


def executemany(sql, param_list):
    """Bulk insert/update helper."""
    if not param_list:
        return
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, param_list, page_size=500)
        conn.commit()
    finally:
        conn.close()
