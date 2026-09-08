// backend/app/api/time-off/requests/[id]/route.js
// Alias for /api/time-off/[id] to support frontend /time-off/requests/[id] endpoint path.

export { GET, PATCH, DELETE } from '../../[id]/route';
