# Backend Setup and Deployment

## Stack
- Node.js + Express
- Sequelize ORM
- Database: PostgreSQL (via `DATABASE_URL`) for both local and production

## Quick Start (Local)
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `backend/.env` and set:
   ```env
   JWT_SECRET=replace-with-a-long-random-secret
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
  DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
   ```
3. Run backend:
   ```bash
   npm run dev
   ```

The backend requires `DATABASE_URL` and syncs PostgreSQL schema on startup.

## Production Environment Variables
Set these in your backend host (Render/Railway/etc):

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
FRONTEND_URL=https://your-frontend-domain.com
```

### Database Requirement
- `DATABASE_URL` is mandatory.
- SQLite fallback has been removed.

## Health Check
`GET /api/health`

Example response:
```json
{
  "status": "Server is running",
  "database": "postgres",
  "environment": "production"
}
```

## Common Errors
- `secretOrPrivateKey must have a value`
  - Cause: `JWT_SECRET` missing.
  - Fix: add `JWT_SECRET` in backend environment.
- CORS blocked in production
  - Cause: frontend domain not configured.
  - Fix: set `FRONTEND_URL` to your deployed frontend URL.
- DB connection failure in production
  - Cause: invalid `DATABASE_URL` or blocked SSL.
  - Fix: verify full Postgres URL from your DB provider.

## Notes
- Do not commit real `.env` files.
- Use PostgreSQL in all environments.
