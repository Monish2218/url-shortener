# URL Shortener API

A production-oriented URL shortener REST API built with **Node.js, TypeScript, Express, and PostgreSQL**.

The project focuses on backend engineering fundamentals: API design, validation, relational database modeling, concurrency-safe updates, error handling, integration testing, graceful shutdown, security hardening, and rate limiting.

---

## Features

* Create shortened URLs
* Random 10-character Base62 short codes
* Redirect short URLs to their original URLs
* URL expiration support
* Click tracking
* Retrieve URL metadata
* Delete URLs
* Input validation with Zod
* Collision-safe short-code generation
* Centralized error handling
* PostgreSQL persistence
* Integration tests with Vitest and Supertest
* Graceful server shutdown
* HTTP security headers with Helmet
* Request body size limits
* Rate limiting for URL creation
* Dockerized PostgreSQL development environment

---

## Tech Stack

| Category        | Technology              |
| --------------- | ----------------------- |
| Runtime         | Node.js                 |
| Language        | TypeScript              |
| Framework       | Express                 |
| Database        | PostgreSQL              |
| Database Driver | node-postgres (`pg`)    |
| Validation      | Zod                     |
| Testing         | Vitest + Supertest      |
| Security        | Helmet                  |
| Rate Limiting   | express-rate-limit      |
| Configuration   | dotenv                  |
| Containers      | Docker / Docker Compose |
| Version Control | Git                     |

---

## Architecture

The application follows a lightweight layered architecture:

```text
HTTP Request
     │
     ▼
  Express
   Routes
     │
     ▼
  Services
     │
     ▼
 PostgreSQL
```

The project intentionally avoids unnecessary abstractions such as repositories and controllers. The service layer provides enough separation between HTTP concerns and business/database logic for the current scope.

### Project Structure

```text
url-shortener/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config.ts
│   ├── db.ts
│   │
│   ├── middleware/
│   │   └── error-handler.ts
│   │
│   ├── routes/
│   │   ├── redirect.ts
│   │   └── url.ts
│   │
│   ├── services/
│   │   └── url.service.ts
│   │
│   ├── utils/
│   │   └── short-code.ts
│   │
│   └── validators/
│       └── url.ts
│
├── tests/
│   ├── health.test.ts
│   ├── redirect.test.ts
│   ├── urls.create.test.ts
│   ├── urls.management.test.ts
│   └── helpers/
│       └── db.ts
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

---

## Database Design

The application uses PostgreSQL with the following core table:

```sql
CREATE TABLE urls (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    short_code VARCHAR(10) NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    click_count BIGINT NOT NULL DEFAULT 0
);
```

### Why PostgreSQL?

PostgreSQL was chosen because the project benefits from:

* Strong relational consistency
* Unique constraints
* Transactions and atomic updates
* Mature indexing
* SQL-based querying
* Reliable production tooling

A distributed key-value database could be appropriate for a URL shortener operating at extremely large scale, but PostgreSQL provides the right balance of capability and complexity for this project.

---

## Short Code Generation

Each shortened URL receives a random 10-character Base62 identifier.

The alphabet is:

```text
0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
```

The application uses Node.js cryptographic randomness to generate the code.

A PostgreSQL `UNIQUE` constraint protects against collisions at the database level.

If a collision occurs, the application generates another code and retries the insert.

This means uniqueness is guaranteed by the database rather than relying solely on application-level probability.

---

## API Reference

### Health Check

```http
GET /api/health
```

Returns the current API health status.

#### Response

```json
{
  "status": "ok"
}
```

---

### Create Short URL

```http
POST /api/urls
Content-Type: application/json
```

#### Request

```json
{
  "originalUrl": "https://example.com"
}
```

An optional expiration time can be provided:

```json
{
  "originalUrl": "https://example.com",
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

#### Response

```http
201 Created
```

```json
{
  "id": "1",
  "shortCode": "aB92xK7mQ2",
  "shortUrl": "http://localhost:3000/aB92xK7mQ2",
  "originalUrl": "https://example.com",
  "createdAt": "2026-10-11T10:00:00.000Z",
  "expiresAt": null
}
```

#### Validation

The API rejects:

* Missing `originalUrl`
* Invalid URLs
* Invalid expiration timestamps
* Expiration timestamps in the past

Invalid requests return:

```http
400 Bad Request
```

---

### Redirect

```http
GET /:shortCode
```

For an active short URL, the API returns:

```http
302 Found
Location: https://example.com
```

Every successful redirect increments the URL's `click_count`.

#### Non-existent URL

```http
404 Not Found
```

```json
{
  "error": "Short URL not found"
}
```

#### Expired URL

```http
410 Gone
```

```json
{
  "error": "Short URL has expired"
}
```

---

### Get URL Metadata

```http
GET /api/urls/:id
```

#### Response

```http
200 OK
```

```json
{
  "id": "1",
  "shortCode": "aB92xK7mQ2",
  "shortUrl": "http://localhost:3000/aB92xK7mQ2",
  "originalUrl": "https://example.com",
  "createdAt": "2026-10-11T10:00:00.000Z",
  "expiresAt": null,
  "clickCount": "5"
}
```

A non-existent ID returns:

```http
404 Not Found
```

---

### Delete URL

```http
DELETE /api/urls/:id
```

Successful deletion returns:

```http
204 No Content
```

A non-existent ID returns:

```http
404 Not Found
```

---

## Error Handling

The API uses consistent HTTP status codes for common cases:

| Status | Meaning               |
| ------ | --------------------- |
| `201`  | Resource created      |
| `204`  | Resource deleted      |
| `302`  | Short URL redirect    |
| `400`  | Invalid request       |
| `404`  | Resource not found    |
| `410`  | Short URL expired     |
| `429`  | Rate limit exceeded   |
| `500`  | Internal server error |

Unexpected application/database errors are handled by centralized Express error middleware.

---

## Click Tracking

Redirects increment the click counter directly in PostgreSQL:

```sql
UPDATE urls
SET click_count = click_count + 1
WHERE short_code = $1
  AND (expires_at IS NULL OR expires_at > NOW())
RETURNING original_url;
```

The increment happens inside the database rather than performing:

```text
SELECT count
    ↓
JavaScript
    ↓
count + 1
    ↓
UPDATE
```

This avoids lost updates when multiple redirect requests arrive concurrently.

---

## Expiration

URLs can optionally have an expiration timestamp.

An active URL is resolved only when:

```text
expires_at IS NULL
OR
expires_at > NOW()
```

Once expired, the API returns:

```http
410 Gone
```

rather than treating the resource as nonexistent.

This allows clients to distinguish between:

* a short URL that never existed
* a short URL that existed but has expired

---

## Rate Limiting

URL creation is rate limited to prevent basic abuse.

The current configuration allows:

```text
30 requests / minute
```

for the URL creation endpoint.

Requests exceeding the limit receive:

```http
429 Too Many Requests
```

The current implementation uses an in-memory rate-limit store, which is appropriate for the project's single-instance architecture.

For a horizontally scaled deployment, the rate-limit state would need to be moved to a shared store such as Redis.

---

## Security

The API includes several basic HTTP security protections:

### Helmet

Helmet is used to configure commonly recommended HTTP security headers.

### Request Body Limit

JSON request bodies are limited to prevent unnecessarily large payloads from reaching the application.

### Input Validation

Incoming URL creation requests are validated using Zod before reaching the database.

### Parameterized SQL

Database queries use PostgreSQL parameters rather than string interpolation:

```ts
pool.query(
  "SELECT * FROM urls WHERE id = $1",
  [id],
);
```

This prevents SQL injection through user-controlled values.

---

## Graceful Shutdown

The application handles process termination signals such as:

```text
SIGINT
SIGTERM
```

During shutdown:

1. The HTTP server stops accepting new connections.
2. Existing requests are allowed to complete.
3. The PostgreSQL connection pool is closed.
4. The process exits.

This makes the application better suited for containerized and managed deployments.

---

## Getting Started

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Docker Desktop

---

### Clone the Repository

```bash
git clone https://github.com/Monish2218/url-shortener.git
cd url-shortener
```

---

### Install Dependencies

```bash
npm install
```

---

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/url_shortener
PORT=3000
BASE_URL=http://localhost:3000
```

A `.env.example` file is included in the repository.

---

## Start PostgreSQL

Start the PostgreSQL container:

```bash
docker compose up -d
```

Verify that the container is running:

```bash
docker ps
```

---

## Run the Development Server

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

---

## Production Build

Compile TypeScript:

```bash
npm run build
```

Start the compiled application:

```bash
npm start
```

---

## Testing

The project uses **Vitest** and **Supertest** for integration testing.

Run the complete test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The test suite covers:

* Health check
* URL creation
* Invalid URL validation
* Active redirects
* Click tracking
* Expired URLs
* Non-existent short URLs
* URL retrieval
* URL deletion
* Rate limiting

The integration tests communicate with a real PostgreSQL database rather than mocking the database layer.

---

## Development Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server with watch mode |
| `npm run build`      | Compile TypeScript                       |
| `npm start`          | Start compiled application               |
| `npm test`           | Run test suite                           |
| `npm run test:watch` | Run tests in watch mode                  |

---

## Design Decisions

### Random Base62 IDs

Random 10-character Base62 codes provide a large identifier space without exposing sequential database IDs.

### Database-Enforced Uniqueness

Short-code collisions are handled using a database `UNIQUE` constraint combined with application-level retries.

### PostgreSQL `BIGINT`

Database IDs and click counts use `BIGINT` to avoid unnecessary limits as the system grows.

`node-postgres` returns PostgreSQL `BIGINT` values as strings by default to avoid JavaScript integer precision problems.

### Service Layer

Business and database operations are kept in a service layer instead of placing SQL directly inside route handlers.

### Atomic Click Tracking

Click counts are incremented directly by PostgreSQL to maintain correctness under concurrent requests.

### Integration Testing

The tests exercise the application through HTTP and PostgreSQL, providing confidence that the API, routing, validation, services, and database work together correctly.

### Lightweight Architecture

The project deliberately avoids excessive abstractions. Additional layers such as repositories, caching, asynchronous analytics, authentication, or distributed infrastructure can be introduced when actual requirements justify them.

---

## Future Improvements

The current project intentionally stops at a practical production-oriented baseline.

Possible future improvements include:

* Authentication and authorization
* Redis caching
* Distributed rate limiting
* Asynchronous click analytics
* Structured application logging
* Observability and metrics
* OpenAPI/Swagger documentation
* Automated CI/CD
* Cloud deployment
* Horizontal scaling
* Analytics dashboards
* Custom aliases
* User accounts and URL ownership

These are intentionally outside the current scope.

---

## License

This project is for learning and portfolio purposes.
