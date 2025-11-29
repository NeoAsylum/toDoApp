import os
import psycopg2
import jwt
import datetime
import bcrypt
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allow all origins

# Database connection
def get_db_connection():
    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST"),
        database=os.environ.get("DB_NAME"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
    )
    return conn

# Create users table if it doesn't exist
def create_users_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
        """
    )
    conn.commit()
    cur.close()
    conn.close()

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, password) VALUES (%s, %s) RETURNING id",
        (username, hashed_password.decode('utf-8')),
    )
    user_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"id": user_id, "username": username}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password FROM users WHERE username = %s", (username,)
    )
    user = cur.fetchone()
    cur.close()
    conn.close()

    if user and bcrypt.checkpw(password.encode('utf-8'), user[1].encode('utf-8')):
        token = jwt.encode(
            {
                "user_id": user[0],
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
            },
            os.environ.get("JWT_SECRET"),
            algorithm="HS256",
        )
        return jsonify({"token": token})
    else:
        return jsonify({"message": "Invalid credentials"}), 401

@app.route("/validate", methods=["POST"])
def validate():
    data = request.get_json()
    token = data.get("token")

    try:
        decoded_token = jwt.decode(token, os.environ.get("JWT_SECRET"), algorithms=["HS256"])
        return jsonify({"user_id": decoded_token["user_id"]}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token has expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 401

@app.route("/check-user", methods=["GET"])
def check_user():
    username = request.args.get("username")

    if not username:
        return jsonify({"error": "Username parameter is missing"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = %s", (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if user:
        return jsonify({"exists": True}), 200
    else:
        return jsonify({"exists": False}), 200


if __name__ == "__main__":
    create_users_table()
    app.run(host="0.0.0.0", port=5000)