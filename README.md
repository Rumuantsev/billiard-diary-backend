# Billiard Diary Backend

Backend service for a billiard training diary.

## Requirements

- Node.js 18 or newer
- Docker and Docker Compose
- Git

## Quick Start

```bash
docker compose up --build
```

After startup, the API is available at:

```text
http://localhost:3000
```

Healthcheck:

```text
GET /health
```

## Auth API

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

Authorization uses JWT access tokens:

```text
Authorization: Bearer <accessToken>
```

Registration rules:

- The first user may be registered without a token, but must have role `admin`.
- After bootstrap, `admin` may register `coach` users.
- `coach` may register `athlete` users.
- `athlete` cannot register users.

## Exercises API

```text
GET    /exercises
GET    /exercises/:id
POST   /exercises
PUT    /exercises/:id
DELETE /exercises/:id
```

All exercise endpoints require a Bearer token.

Access rules:

- `admin` can access all exercises.
- `coach` can access only own exercises.
- `athlete` cannot access exercises directly.
- `POST /exercises` sets `author_id` from the token; clients must not send `authorId`.

`GET /exercises` supports query parameters:

- `search`
- `folderId`
- `authorId`
- `limit`
- `offset`

`DELETE /exercises/:id` uses soft delete and returns the deleted exercise.

## Local Database Note

The project still uses `src/init.sql` instead of migrations. PostgreSQL runs it only when the database volume is created for the first time. If the schema changes and an old `pgdata` volume already exists, recreate the volume before starting Docker again.
