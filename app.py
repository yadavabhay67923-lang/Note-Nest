
from flask import Flask, request, jsonify, session, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import sqlite3
import os
import secrets
import hmac

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False

import secrets

DATABASE = "notes.db"


# Database Connection
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# Create Database Tables
def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

# Check CSRF Token
def csrf_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-CSRF-Token")
        session_token = session.get("csrf_token")

        if not token or not session_token:
            return jsonify({"error": "CSRF token missing"}), 403

        if not hmac.compare_digest(token, session_token):
            return jsonify({"error": "Invalid CSRF token"}), 403

        return func(*args, **kwargs)

    return wrapper

# Check User Login
def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Please login first"}), 401

        return func(*args, **kwargs)

    return wrapper


# Home Page
@app.route("/")
def home():
    return render_template("index.html")

# Get CSRF Token
@app.route("/api/csrf", methods=["GET"])
def get_csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)

    return jsonify({
        "csrf_token": session["csrf_token"]
    })


# User Signup
@app.route("/api/signup", methods=["POST"])
@csrf_required
def signup():
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if "@" not in email or "." not in email:
        return jsonify({"error": "Enter a valid email"}), 400

    if len(password) < 6:
        return jsonify({
            "error": "Password must be at least 6 characters"
        }), 400

    hashed_password = generate_password_hash(password)

    conn = get_db()

    try:
        cursor = conn.execute(
            """INSERT INTO users (name, email, password)
               VALUES (?, ?, ?)""",
            (name, email, hashed_password)
        )

        conn.commit()

        session.clear()
        session["user_id"] = cursor.lastrowid
        session["user_name"] = name

        return jsonify({
            "message": "Account created successfully",
            "name": name
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409

    finally:
        conn.close()


# User Login
@app.route("/api/login", methods=["POST"])
@csrf_required
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    conn = get_db()

    user = conn.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    conn.close()

    if user and check_password_hash(user["password"], password):
        session.clear()
        session["user_id"] = user["id"]
        session["user_name"] = user["name"]

        return jsonify({
            "message": "Login successful",
            "name": user["name"]
        })

    return jsonify({"error": "Invalid email or password"}), 401


# Check Current User
@app.route("/api/me", methods=["GET"])
@login_required
def current_user():
    return jsonify({
        "name": session["user_name"]
    })


# User Logout
@app.route("/api/logout", methods=["POST"])
@login_required
@csrf_required
def logout():
    session.clear()

    return jsonify({
        "message": "Logout successful"
    })


# Get All User Notes
@app.route("/api/notes", methods=["GET"])
@login_required
def get_notes():
    conn = get_db()

    notes = conn.execute(
        """SELECT id, title, content, created_at
           FROM notes
           WHERE user_id = ?
           ORDER BY id DESC""",
        (session["user_id"],)
    ).fetchall()

    conn.close()

    return jsonify([dict(note) for note in notes])


# Create New Note
@app.route("/api/notes", methods=["POST"])
@login_required
@csrf_required
def create_note():
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title or not content:
        return jsonify({
            "error": "Title and content are required"
        }), 400

    conn = get_db()

    conn.execute(
        """INSERT INTO notes (user_id, title, content)
           VALUES (?, ?, ?)""",
        (session["user_id"], title, content)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Note created successfully"
    }), 201


# Update Existing Note
@app.route("/api/notes/<int:note_id>", methods=["PUT"])
@login_required
@csrf_required
def update_note(note_id):
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title or not content:
        return jsonify({
            "error": "Title and content are required"
        }), 400

    conn = get_db()

    cursor = conn.execute(
        """UPDATE notes
           SET title = ?, content = ?
           WHERE id = ? AND user_id = ?""",
        (title, content, note_id, session["user_id"])
    )

    conn.commit()
    updated = cursor.rowcount
    conn.close()

    if updated == 0:
        return jsonify({"error": "Note not found"}), 404

    return jsonify({
        "message": "Note updated successfully"
    })


# Delete Note
@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
@login_required
@csrf_required
def delete_note(note_id):
    conn = get_db()

    cursor = conn.execute(
        """DELETE FROM notes
           WHERE id = ? AND user_id = ?""",
        (note_id, session["user_id"])
    )

    conn.commit()
    deleted = cursor.rowcount
    conn.close()

    if deleted == 0:
        return jsonify({"error": "Note not found"}), 404

    return jsonify({
        "message": "Note deleted successfully"
    })


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
