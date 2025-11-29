**ToDoApp** — multi-service todo application (frontend + auth + todo API + Postgres)

This repository contains a small example ToDo application split into separate containers and orchestrated with Docker Compose. It includes:

- `client/` — static frontend (served by Nginx).
- `server/auth_service/` — Flask-based authentication service (register, login, validate token).
- `server/todo_api/` — Flask-based ToDo API (CRUD operations). It validates tokens by calling the auth service.
- `db` and `db_auth` — two PostgreSQL containers used by the todo API and auth service respectively (configured in `docker-compose.yml`).

**High-level architecture**
- The browser client communicates with the Auth Service to authenticate users and with the ToDo API for todo CRUD operations.
- The ToDo API checks tokens by calling the Auth Service `/validate` endpoint and uses a Postgres DB to persist todos.
- An Nginx container is provided to proxy and serve the static client, exposing the client at the root path `/`.

Contents of this README
- Project Structure
- Prerequisites
- Quick start
- Services & ports
- Environment variables
- API endpoints
- Local development notes
- Design Document

Project Structure
- `.gitignore`: Specifies intentionally untracked files to ignore.
- `actual_requirements.txt`: Contains the detailed functional and technical requirements for the project.
- `docker-compose.yml`: Defines and runs the multi-container Docker application.
- `nginx.conf`, `nginx.crt`, `nginx.key`: Nginx configuration and SSL certificates for the proxy server.
- `README.md`: This file, providing an overview and instructions.
- `client/`: Contains the static frontend application.
    - `app.js`: Frontend JavaScript logic.
    - `Dockerfile`: Dockerfile for the client application.
    - `favicon.svg`: Favicon for the client.
    - `index.html`: Main HTML file for the client.
    - `style.css`: Stylesheet for the client.
- `server/`: Contains the backend services.
    - `auth_service/`: Flask-based authentication service.
        - `app.py`: Main application file for the auth service.
        - `Dockerfile`: Dockerfile for the auth service.
        - `requirements.txt`: Python dependencies for the auth service.
    - `todo_api/`: Flask-based ToDo API service.
        - `app.py`: Main application file for the ToDo API.
        - `Dockerfile`: Dockerfile for the ToDo API.
        - `requirements.txt`: Python dependencies for the ToDo API.

Prerequisites
- Docker & Docker Compose

Quick start
```powershell
docker-compose up --build -d
```

Access the app:
- Frontend: https://localhost:8080/
- ToDo API: http://localhost:5001
- Auth Service: Internal only

Stop and remove volumes:
```powershell
docker-compose down -v
```

Services & key ports
- `nginx` — host:8080 -> container:443 (configured with `nginx.conf`) — external TLS entrypoint.
- `client` — static frontend (internal port 80 in the container). Served via nginx proxy at root `/`.
- `todo_api` — host:5001 -> container:5000 (Flask app)
- `auth_service` — internal only -> container:5000 (Flask app)
- `db` (Postgres) — internal DB for `todo_api` (container internal port 5432)
- `db_auth` (Postgres) — internal DB for `auth_service` (container internal port 5432)

Environment variables (set in `docker-compose.yml`)
- `todo_api` expects:
    - `AUTH_SERVICE_URL` (internal service URL used by the todo API, e.g. `http://auth_service:5000`)
    - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `auth_service` expects:
    - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
    - `JWT_SECRET` (used to sign JWT tokens)

If you run services locally (without Docker), export these env vars before starting the Flask apps.

API reference

Auth Service (`auth_service`)
- `POST /register` — register a new user
    - Request JSON: `{ "username": "...", "password": "..." }`
    - Response: created user info `{ "id": <id>, "username": "..." }`
- `POST /login` — login
    - Request JSON: `{ "username": "...", "password": "..." }`
    - Response: `{ "token": "<jwt>" }` (store in `localStorage` on the client)
- `POST /validate` — validate token (used by todo_api middleware)
    - Request JSON: `{ "token": "<jwt>" }`
    - Response: `{ "user_id": <id> }` if valid
- `GET /check-user?username=<username>` — check if username exists

ToDo API (`todo_api`) — requires `Authorization: Bearer <token>` on protected endpoints
- `GET /todos` — get todos for the authenticated user
- `POST /todos` — create a new todo
    - Request JSON example: `{ "task": "Buy milk", "due_date": "2025-11-20", "priority": "Medium" }`
- `PUT /todos/<id>` — update a todo (fields: task, completed, due_date, priority, status)
- `DELETE /todos/<id>` — delete a todo
- `GET /health` — simple health check (returns `OK`)

Client
- The frontend JavaScript (`client/app.js`) expects to access APIs via the proxied paths set by `nginx.conf`: the client calls the auth and todo endpoints under `/api/auth` and `/api/todos` respectively. When using the provided Docker Compose + Nginx setup, these requests are proxied to `auth_service` and `todo_api`.

Development notes
- Local run without Docker (quick):
    - For `auth_service`:
        - Set `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` in your shell.
        - `cd server/auth_service && python app.py`
    - For `todo_api`:
        - Set `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AUTH_SERVICE_URL`.
        - `cd server/todo_api && python app.py`
    - The services each create their required tables on startup (`users` and `todos`).

Dependencies
- `server/auth_service/requirements.txt`: Flask, psycopg2-binary, PyJWT, bcrypt, Flask-Cors
- `server/todo_api/requirements.txt`: Flask, psycopg2-binary, requests, Flask-Cors

Security notes
- **JWT_SECRET**: Do not use the placeholder secret in production; provide a strong secret via env var.
- **HTTPS certs**: `nginx` in this repository expects `nginx.crt` / `nginx.key` files mounted into the container. For local testing you can use self-signed certificates.

Troubleshooting
- Check `docker-compose logs` if services fail to start.
- Ensure ports 8080 and 5001 are free.

Design Document
For a detailed breakdown of functional and technical requirements, please refer to `actual_requirements.txt`.


