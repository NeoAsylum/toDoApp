import os
import psycopg2
from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app) # Allow all origins

# Database connection
def get_db_connection(max_retries=10, delay=5):
    retries = 0
    while retries < max_retries:
        try:
            conn = psycopg2.connect(
                host=os.environ.get("DB_HOST"),
                database=os.environ.get("DB_NAME"),
                user=os.environ.get("DB_USER"),
                password=os.environ.get("DB_PASSWORD"),
            )
            return conn
        except psycopg2.OperationalError as e:
            retries += 1
            if retries == max_retries:
                raise e
            print(f"DB connection failed (Attempt {retries}/{max_retries}). Retrying in {delay} seconds...")
            time.sleep(delay)
    raise Exception("Failed to establish database connection after multiple retries.")

# Create todos table if it doesn't exist
def create_todos_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS todos (
            id SERIAL PRIMARY KEY,
            task TEXT NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            user_id INTEGER NOT NULL,
            due_date DATE,
            priority VARCHAR(20),
            status VARCHAR(20)
        );
        """
    )
    conn.commit()
    cur.close()
    conn.close()

# Authentication
@app.before_request
def auth_middleware():
    if request.method == 'OPTIONS':
        return
    if request.endpoint in ["health_check"]:
        return
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"message": "Missing authorization header"}), 401

    try:
        token = auth_header.split(" ")[1]
        response = requests.post(
            "http://auth_service:5000/validate", json={"token": token}
        )
        if response.status_code != 200:
            return jsonify({"message": "Invalid token"}), 401
        request.user = response.json()
    except Exception as e:
        return jsonify({"message": "Invalid token"}), 401


@app.route("/health")
def health_check():
    return "OK"

# To-Do routes
@app.route("/todos", methods=["POST"])
def add_todo():
    data = request.get_json()
    task = data.get("task")
    due_date = data.get("due_date")
    priority = data.get("priority", "Medium")
    status = data.get("status", "Not Started")
    user_id = request.user.get("user_id")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO todos (task, user_id, due_date, priority, status) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (task, user_id, due_date, priority, status),
    )
    todo_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"id": todo_id, "task": task, "completed": False, "due_date": due_date, "priority": priority, "status": status}), 201


@app.route("/todos", methods=["GET"])
def get_todos():
    user_id = request.user.get("user_id")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, task, completed, due_date, priority, status FROM todos WHERE user_id = %s", (user_id,))
    todos = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify([{"id": row[0], "task": row[1], "completed": row[2], "due_date": row[3], "priority": row[4], "status": row[5]} for row in todos])


@app.route("/todos/<int:todo_id>", methods=["PUT"])
def update_todo(todo_id):
    data = request.get_json()
    user_id = request.user.get("user_id")

    # Build SET clause
    set_clauses = []
    params = []

    if "task" in data:
        set_clauses.append("task = %s")
        params.append(data["task"])
    if "completed" in data:
        set_clauses.append("completed = %s")
        params.append(data["completed"])
    if "due_date" in data:
        set_clauses.append("due_date = %s")
        params.append(data["due_date"])
    if "priority" in data:
        set_clauses.append("priority = %s")
        params.append(data["priority"])
    if "status" in data:
        set_clauses.append("status = %s")
        params.append(data["status"])

    if not set_clauses:
        return jsonify({"message": "No fields to update"}), 400

    query = f"UPDATE todos SET {', '.join(set_clauses)} WHERE id = %s AND user_id = %s"
    params.extend([todo_id, user_id])

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(query, tuple(params))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "To-Do updated successfully"})


@app.route("/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):
    user_id = request.user.get("user_id")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM todos WHERE id = %s AND user_id = %s", (todo_id, user_id))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "To-Do deleted successfully"})


if __name__ == "__main__":
    create_todos_table()
    app.run(host="0.0.0.0", port=5000)