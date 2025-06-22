import sqlite3
import os

DATABASE_PATH = "publicpooper.db"

def init_database():
    """Initialize database with schema"""
    if not os.path.exists(DATABASE_PATH):
        conn = sqlite3.connect(DATABASE_PATH)
        try:
            with open("schema.ddl", "r") as f:
                schema = f.read()
                conn.executescript(schema)
            conn.commit()
            print(f"Database initialized successfully at {DATABASE_PATH}")
        except Exception as e:
            print(f"Error initializing database: {e}")
            raise
        finally:
            conn.close()
    else:
        print(f"Database already exists at {DATABASE_PATH}")
