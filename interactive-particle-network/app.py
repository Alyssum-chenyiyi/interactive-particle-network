from pathlib import Path
import sqlite3

from flask import Flask, jsonify, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "stars.db"

app = Flask(__name__, static_folder=".", static_url_path="")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/api/messages")
def get_messages():
    conn = get_db_connection()
    rows = conn.execute("SELECT id, text FROM messages ORDER BY id ASC").fetchall()
    conn.close()
    return jsonify([{"id": row["id"], "text": row["text"]} for row in rows])


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


if __name__ == "__main__":
    app.run(debug=True)
