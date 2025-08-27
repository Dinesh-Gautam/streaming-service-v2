# Microservices API Design

This document outlines the API contracts for the new microservices that will be extracted from the monolithic application.

---

## 1. User Service

**Base URL:** `/api/users`

This service is responsible for all user-related operations, including authentication, authorization, and user profile management.

### Data Models

**User**

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "string"
}
```

### Endpoints

#### 1.1. Get All Users

- **Endpoint:** `GET /`
- **Description:** Retrieves a list of all users.
- **Response (200 OK):**
  ```json
  [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string"
    }
  ]
  ```

#### 1.2. Get User by ID

- **Endpoint:** `GET /{id}`
- **Description:** Retrieves a single user by their ID.
- **Response (200 OK):** `User`
- **Response (404 Not Found):** If the user does not exist.

#### 1.3. Create User

- **Endpoint:** `POST /`
- **Description:** Creates a new user.
- **Request Body:**
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "role": "string"
  }
  ```
- **Response (201 Created):** `User`

#### 1.4. Update User

- **Endpoint:** `PUT /{id}`
- **Description:** Updates an existing user's information.
- **Request Body:**
  ```json
  {
    "name": "string",
    "email": "string",
    "role": "string"
  }
  ```
- **Response (200 OK):** `User`
- **Response (404 Not Found):** If the user does not exist.

#### 1.5. Delete User

- **Endpoint:** `DELETE /{id}`
- **Description:** Deletes a user.
- **Response (204 No Content):** On successful deletion.
- **Response (404 Not Found):** If the user does not exist.

---

## 2. Movie Catalog Service

**Base URL:** `/api/movies`

This service is responsible for managing movie information, including both original content from the internal database and data from external APIs like TMDB.

### Data Models

**MovieSummary**

```json
{
  "id": "string",
  "title": "string",
  "release_date": "string",
  "poster_path": "string",
  "backdrop_path": "string",
  "isOriginal": "boolean"
}
```

**MovieDetail**

```json
{
  "id": "string",
  "title": "string",
  "overview": "string",
  "release_date": "string",
  "genres": [{ "id": "number", "name": "string" }],
  "poster_path": "string",
  "backdrop_path": "string",
  "isOriginal": "boolean",
  "media_type": "string",
  "subtitles": [{ "language": "string", "url": "string" }],
  "aiGeneratedSubtitles": [{ "language": "string", "url": "string" }],
  "aiGeneratedAudio": [{ "language": "string", "url": "string" }],
  "thumbnailUrl": "string",
  "playbackUrl": "string",
  "chaptersUrl": "string"
}
```

### Endpoints

#### 2.1. Get Popular Movies

- **Endpoint:** `GET /popular`
- **Description:** Retrieves a list of popular movies from TMDB.
- **Response (200 OK):** `[MovieSummary]`

#### 2.2. Get Trending Media

- **Endpoint:** `GET /trending`
- **Description:** Retrieves a list of trending movies and TV shows.
- **Response (200 OK):** `[MovieSummary]`

#### 2.3. Get Now Playing Movies

- **Endpoint:** `GET /now-playing`
- **Description:** Retrieves a list of movies currently playing in theaters.
- **Response (200 OK):** `[MovieSummary]`

#### 2.4. Get Original Movies

- **Endpoint:** `GET /originals`
- **Description:** Retrieves a list of original movies from the internal database.
- **Response (200 OK):** `[MovieSummary]`

#### 2.5. Get Movie Details

- **Endpoint:** `GET /{id}`
- **Query Params:** `source=tmdb|original` (required)
- **Description:** Retrieves detailed information for a specific movie or TV show.
- **Response (200 OK):** `MovieDetail`
- **Response (404 Not Found):** If the movie does not exist.

---

## 3. Media Service

**Base URL:** `/api/media`

This service handles all media processing tasks, including transcoding, subtitle generation, and AI-driven analysis. It operates asynchronously.

### Data Models

**MediaProcessingJob**

```json
{
  "jobId": "string",
  "mediaId": "string",
  "jobStatus": "pending | running | completed | failed",
  "tasks": [
    {
      "taskId": "string",
      "engine": "string",
      "status": "pending | running | completed | failed",
      "progress": "number",
      "error": "string | null"
    }
  ]
}
```

### Endpoints

#### 3.1. Start Media Processing Job

- **Endpoint:** `POST /process`
- **Description:** Initiates a new media processing job for a given media file. This would typically be called by another service (e.g., the Movie Catalog Service) after a file upload.
- **Request Body:**
  ```json
  {
    "mediaId": "string",
    "inputFileUrl": "string"
  }
  ```
- **Response (202 Accepted):**
  ```json
  {
    "jobId": "string"
  }
  ```

#### 3.2. Get Job Status

- **Endpoint:** `GET /jobs/{jobId}`
- **Description:** Retrieves the current status and progress of a media processing job.
- **Response (200 OK):** `MediaProcessingJob`
- **Response (404 Not Found):** If the job does not exist.

---

## 4. Search Service

**Base URL:** `/api/search`

This service provides a centralized search endpoint for all searchable content, including movies, users, and other resources.

### Data Models

**SearchResult**

```json
{
  "id": "string",
  "type": "movie | tv | person | user",
  "title": "string",
  "description": "string",
  "url": "string"
}
```

### Endpoints

#### 4.1. Multi-Search

- **Endpoint:** `GET /`
- **Query Params:** `q` (string, required)
- **Description:** Performs a multi-faceted search across all indexed content.
- **Response (200 OK):**
  ```json
  [
    SearchResult
  ]
  ```

#### 4.2. Search Suggestions

- **Endpoint:** `GET /suggest`
- **Query Params:** `q` (string, required)
- **Description:** Provides a lightweight list of search suggestions for autocomplete functionality.
- **Response (200 OK):**
  ```json
  [
    {
      "id": "string",
      "title": "string"
    }
  ]
  ```

---
