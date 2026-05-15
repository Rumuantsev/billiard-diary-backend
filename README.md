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

If you run the backend without Docker:

```bash
npm install
npm run dev
```

In this mode the API still uses the database settings from `.env` or defaults
from `src/config.js`.

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
- Exercise responses use camelCase.
- `POST /exercises` sets `authorId` from the token; clients must not send it.
- If `folderId` is provided, the folder must exist and be accessible to the current user.

`GET /exercises` supports query parameters:

- `search`
- `folderId`
- `authorId`
- `limit`
- `offset`

The list response includes `pagination.total`.

`DELETE /exercises/:id` uses soft delete and returns the deleted exercise.

## Folders API

```text
GET    /folders
GET    /folders/:id
POST   /folders
PATCH  /folders/:id
DELETE /folders/:id
```

Folders organize the exercise library. All folder endpoints require a Bearer
token. `coach` can manage only own folders, `admin` can manage all folders,
and `athlete` cannot access folders directly.

## Users API

```text
GET /users
```

All user endpoints require a Bearer token.

Query parameters:

- `role`: optional, one of `admin`, `coach`, `athlete`
- `groupId`: optional group filter for athletes

Rules:

- `admin` can list users.
- `coach` can list own athletes.
- `athlete` cannot list users.
- `groupId` can be used only with `role=athlete` or without `role`.
- `role=coach&groupId=1` and `role=admin&groupId=1` return validation/business errors.

## Groups API

```text
GET    /groups
GET    /groups/:id
POST   /groups
PATCH  /groups/:id
DELETE /groups/:id
POST   /groups/:id/athletes
DELETE /groups/:id/athletes/:athleteId
```

Groups are coach-owned. Only `coach` can manage groups. A coach can add only
their own athletes to a group. Deleting a group uses soft delete.

Example create group:

```json
{
  "name": "Junior A",
  "description": "Morning junior group",
  "athleteIds": [3, 4]
}
```

## Trainings API

```text
POST   /trainings
GET    /trainings

GET    /trainings/group/:id
PATCH  /trainings/group/:id
DELETE /trainings/group/:id
PATCH  /trainings/group/:id/status

GET    /trainings/athlete/:id
PATCH  /trainings/athlete/:id
DELETE /trainings/athlete/:id
PATCH  /trainings/athlete/:id/status

POST   /trainings/athlete/:id/items
PATCH  /trainings/athlete/:id/items/:itemId
DELETE /trainings/athlete/:id/items/:itemId
PATCH  /trainings/athlete/:id/items/:itemId/status
PATCH  /trainings/athlete/:id/items/:itemId/result
```

Training model:

- `group_training` is a group-level appointment.
- `athlete_training` is a concrete athlete's training.
- Individual training creates only `athlete_training`.
- Group training creates one `group_training` and one `athlete_training` for each athlete in the group.
- `training_item` is one exercise inside one `athlete_training`.

Create individual training:

```json
{
  "athleteId": 3,
  "startsAt": "2026-05-20T10:00:00+07:00",
  "endsAt": "2026-05-20T11:30:00+07:00",
  "items": [
    {
      "exerciseId": 1,
      "orderIndex": 0,
      "targetAttempts": 10
    }
  ]
}
```

Create group training:

```json
{
  "groupId": 1,
  "startsAt": "2026-05-21T10:00:00+07:00",
  "endsAt": "2026-05-21T11:30:00+07:00",
  "items": [
    {
      "exerciseId": 1,
      "orderIndex": 0,
      "targetAttempts": 10
    }
  ]
}
```

Access rules:

- `admin` does not work with trainings.
- `coach` can create trainings only for own athletes and own groups.
- `coach` can view and manage own trainings.
- `athlete` can view only assigned `athlete_training`.
- `athlete` cannot view `group_training` directly.
- `athlete` can move own training from `scheduled` to `in_progress`, then from `in_progress` to `completed`.
- `athlete` can update item status/result only for own training.

Training status transitions:

```text
scheduled   -> in_progress
scheduled   -> cancelled
scheduled   -> missed
in_progress -> completed
```

Training item status transitions:

```text
not_started -> in_progress
not_started -> skipped
in_progress -> completed
in_progress -> skipped
```

Editing rules:

- Training dates and item composition can be changed only while training status is `scheduled`.
- Item result can be changed only while athlete training is `in_progress` and item status is `in_progress`.
- `resultSuccesses` cannot be greater than `resultAttempts`.

## Visible API Flow

You can run a visible PowerShell scenario that prints every request and response:

```powershell
.\scripts\visible-api-flow.ps1
```

The script checks:

- auth for seed coach/admin
- athlete registration
- group creation
- athlete filtering by group
- exercise creation
- individual training creation
- group training creation
- coach and athlete training views
- scheduled training edits
- item management
- athlete execution flow
- expected access errors
- expected state-machine errors

## Local Database Note

The project still uses `src/init.sql` instead of migrations. PostgreSQL runs it only when the database volume is created for the first time. If the schema changes and an old `pgdata` volume already exists, recreate the volume before starting Docker again.

For Docker:

```bash
docker compose down -v
docker compose up --build
```

`down -v` deletes the local PostgreSQL volume, so do it only when you are ready
to reset local data.
