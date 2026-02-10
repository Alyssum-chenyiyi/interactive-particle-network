from pathlib import Path
import sqlite3

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "stars.db"


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            text TEXT NOT NULL
        )
        """
    )
    cur.execute("DELETE FROM messages")
    cur.executemany(
        "INSERT INTO messages (id, text) VALUES (?, ?)",
        [
            (1, "欢迎来到星空网络。"),
            (2, "点击星星，发现隐藏的故事。"),
            (3, "愿你在此找到灵感。"),
        ],
    )
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


if __name__ == "__main__":
    main()
