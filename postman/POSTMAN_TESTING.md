# HRMS API — Postman Testing Guide (Complete)

> Real database: **Neon PostgreSQL** | Server: **http://localhost:3100**
> Auth: **httpOnly Cookie (hrms_token)** — Postman ka cookie jar automatic handle karega.

---

## 1. Setup (First Time)

1. Postman kholo → **New** → **HTTP Request**
2. Left side **Collections** tab → **New Collection** → naam do: `HRMS API Tests`
3. Collection ke **3-dot menu** → **Edit** → **Variables** tab:
   | Variable | Initial Value | Current Value |
   |---|---|---|
   | `base_url` | `http://localhost:3100` | `http://localhost:3100` |
4. URLs mein hamesha `{{base_url}}/api/...` use karo.

### Cookie Jar (Important)

- JWT **httpOnly** cookie hai — browser JS se nahi padi jaati, par **Postman automatic handle** karta hai.
- Login karte hi cookie store ho jaati hai. Baaki saare requests mein automatically chali jaati hai.
- 👉 Role switch karte waqt: Postman top-right **Cookies** icon → `hrms_token` → **Delete** → phir naye role se login karo.

---

## 2. Test Users (Sab password same: `Password123!`)

---

## 3. Collection Structure (Recommended)

```
HRMS API Tests
├── Auth
│   ├── Login (ADMIN)
│   ├── Login (HR_MANAGER)
│   ├── Login (HR)
│   ├── Login (PAYROLL)
│   ├── Login (EMPLOYEE)
│   ├── Logout
│   └── Me (GET /api/auth/me)
├── Master Data
│   ├── GET /api/company
│   ├── GET /api/departments
│   ├── GET /api/positions
│   ├── GET /api/schedules
│   ├── GET /api/roles
│   └── GET /api/users
├── Employees
│   ├── GET /api/employees
│   ├── GET /api/employees/1
│   ├── POST /api/employees
│   ├── PATCH /api/employees/1
│   └── DELETE /api/employees/1
├── Contracts
│   ├── GET /api/contracts
│   ├── GET /api/contracts/1
│   ├── POST /api/contracts
│   ├── PATCH /api/contracts/1
│   └── DELETE /api/contracts/1
├── Payroll
│   ├── GET /api/payruns
│   ├── POST /api/payruns
│   ├── GET /api/payruns/1
│   ├── PATCH /api/payruns/1
│   ├── POST /api/payruns/1/finalize
│   ├── GET /api/payslips
│   ├── GET /api/payslips/1
│   ├── POST /api/payslips/1/finalize
│   └── GET /api/payslips/1/pdf
├── Attendance & Leave
│   ├── GET /api/attendance
│   ├── POST /api/attendance/check-in
│   ├── POST /api/attendance/check-out
│   ├── GET /api/time-off
│   └── POST /api/time-off
└── Security Tests
    ├── No Cookie → 401
    ├── Forged JWT → 401
    ├── Expired JWT → 401
    ├── Inactive User → 403
    ├── No Role → 403
    ├── Missing Permission → 403
---

## 4. Auth APIs

| Method | URL | Body | Expected |
|---|---|---|---|
| POST | `{{base_url}}/api/auth/login` | `{"email":"admin@acmedemo.com","password":"Password123!"}` | **200** |
| POST | `{{base_url}}/api/auth/logout` | — | **200** |
| GET | `{{base_url}}/api/auth/me` | — | **200** |
| POST | `{{base_url}}/api/auth/register` | — | **410 Gone** (disabled) |

**Login Response Body** (`200`):

```json
{
  "user": {
    "id": 1, "role_id": 1, "role_code": "ADMIN", "role_name": "Administrator",
    "permissions": ["*"], "email": "admin@acmedemo.com",
    "first_name": "System", "last_name": "Administrator",
    "phone": "+1 512 555 0101", "is_active": true, ...
  }
}
```

**✅ Verify (Security #11 #12):**
- Response Body mein `password_hash`, `passwordHash`, `token` **NAHI** dikhna chahiye.
- Response **Headers** tab → `Set-Cookie: hrms_token=eyJ...; HttpOnly; SameSite=Strict; Path=/`

---

## 5. Master Data APIs

| Method | URL | Perm | Expected |
|---|---|---|---|
| GET | `{{base_url}}/api/company` | company:read | **200** |
| GET | `{{base_url}}/api/departments` | departments:read | **200** |
| GET | `{{base_url}}/api/positions` | positions:read | **200** |
| GET | `{{base_url}}/api/schedules` | schedules:read | **200** |
| GET | `{{base_url}}/api/roles` | roles:read | **200** |
| GET | `{{base_url}}/api/users` | users:read | **200** (EMPLOYEE → 403) |

### POST `{{base_url}}/api/departments` (ADMIN → `201`)

```json
{
  "name": "Postman Test Dept",
  "code": "PM-TEST-01",
  "description": "Created via Postman",
  "status": "active"
}
```

- Duplicate code → **409** | Missing name/code → **400**

### POST `{{base_url}}/api/positions` (ADMIN → `201`)

```json
{
  "title": "Postman Engineer",
  "code": "PM-POS-01",
  "department_id": 1,
  "employment_type": "full_time",
  "salary_min": 50000,
  "salary_max": 120000
}
```

### POST `{{base_url}}/api/schedules` (ADMIN → `201`)

```json
---

## 6. Employee APIs

### GET `{{base_url}}/api/employees?page=1&limit=10&search=carter` → `200`
- `search`, `page`, `limit` query params supported.
- Response: `{"employees": [...], "pagination": {"page", "limit", "total", "totalPages"}}`

### GET `{{base_url}}/api/employees/1` → `200`

### POST `{{base_url}}/api/employees` (ADMIN/HR_MANAGER/HR → `201`)
**Body (minimum valid):**

```json
{
  "employee_code": "EMP-PM-001",
  "first_name": "Postman",
  "last_name": "Tester",
  "email": "postman.tester1@acmedemo.com",
  "hire_date": "2025-01-15",
  "employment_type": "full_time",
  "status": "active",
  "department_id": 1,
  "job_position_id": 1
}
```

**Business rule violations → `422`:**
- `hire_date` > `termination_date`
- status active + `termination_date` present
- status `terminated` bina `termination_date`
- `job_position_id` wrong company

### PATCH `{{base_url}}/api/employees/1`

```json
{ "phone": "+1 555 999 8888", "city": "Austin" }
```

### DELETE `{{base_url}}/api/employees/1` → `204` (ADMIN)

---

## 7. Contract APIs (ADMIN-only, permission: `schedules:read/write`)

### GET `{{base_url}}/api/contracts` → `200` (12 seeded)
### GET `{{base_url}}/api/contracts/1` → `200`

Response: `{"contract": {"id", "employee_id", "company_id", "job_position_id", "reference_no", "start_date", "salary_amount", "pay_frequency", "status", ...}}`

### POST `{{base_url}}/api/contracts` (ADMIN → `201`)
**Important:** Seed mein saare employees ke paas pehle se `active` contract hai. Isliye **`status: "draft"`** use karo warna **409** aayega (active-contract unique index):

```json
{
  "employee_id": 8,
  "job_position_id": 6,
  "working_schedule_id": 1,
  "salary_structure_id": 1,
  "contract_type": "permanent",
  "title": "Postman Contract",
  "reference_no": "PM-CON-001",
  "start_date": "2026-01-01",
  "salary_amount": 95000,
---

## 8. Payroll APIs (ADMIN / PAYROLL role)

### GET `{{base_url}}/api/payruns` → `200 {"payruns": [...]}`
### GET `{{base_url}}/api/payruns/1` → `200 {"payrun": {..., "payslips": [...]}}`

### POST `{{base_url}}/api/payruns` (→ `201`, payroll auto-process hota hai)

```json
{
  "name": "Postman Payrun 2026-09",
  "pay_period_start": "2026-09-01",
  "pay_period_end": "2026-09-30",
  "payment_date": "2026-10-01",
  "pay_frequency": "monthly",
  "currency": "INR"
}
```

**Validation (`400`):**
- `pay_period_end` < `pay_period_start` → 400
- `payment_date` < `pay_period_end` → 400

### PATCH `{{base_url}}/api/payruns/{id}` (sirf `draft` status)

```json
{ "name": "Updated Payrun Name", "notes": "hello" }
```

- Non-draft → **409** `cannot be edited after it is {status}` (Security #13 ✅)

### POST `{{base_url}}/api/payruns/{id}/finalize` → `200` (status → `approved`)
### GET `{{base_url}}/api/payslips` → `200`
### GET `{{base_url}}/api/payslips/{id}` → `200 {"payslip": {..., "lines": [...]}}`
### POST `{{base_url}}/api/payslips/{id}/finalize` → `200`
### GET `{{base_url}}/api/payslips/{id}/pdf` → `200` (PDF, contentType: `application/pdf`)
### POST `{{base_url}}/api/payslips/{payrun_id}/generate` → duplicate → **409**

---

## 9. Attendance & Time-Off

### POST `{{base_url}}/api/attendance/check-in` (attendance:write) → `201`
- No body (current user's linked employee). Bina linked employee → **404**

### POST `{{base_url}}/api/attendance/check-out` → `201`
### GET `{{base_url}}/api/attendance?start=2026-09-01&end=2026-09-30` → `200`

### GET `{{base_url}}/api/time-off` → `200 {"time_off_requests": [...]}`
---

## 10. 🔐 Security Tests (Phase 16.2) — 13 Scenarios

### S1. Unauthenticated → 401

Cookie jar **empty** rakhke inhe hit karo:
- `GET {{base_url}}/api/contracts` → **401** `{"error":"Not authenticated."}`
- `GET {{base_url}}/api/employees` → **401**
- `GET {{base_url}}/api/payruns` → **401**
- `GET {{base_url}}/api/auth/me` → **401**

### S2. Forged / Invalid JWT → 401

1. **Cookies icon** → **Edit** → manual cookie add karo:
   - Name: `hrms_token`
   - Value: `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.INVALID_SIGNATURE`
2. `GET {{base_url}}/api/contracts` → **401**

### S3. Expired JWT → 401

1. `backend/.env.local` mein `JWT_EXPIRES_IN="5s"` karo
2. Server restart: `cd backend && npx next build && set PORT=3100 && npx next start`
3. Login karo → 5 sec ke andar `GET /api/auth/me` → **200**
4. 5 sec ruko → wahi request → **401**
5. `JWT_EXPIRES_IN="7d"` waapas set karo + restart

### S4. Inactive User → 403

- Kisi user ko inactive karo (Neon DB):

```sql
UPDATE users SET is_active = FALSE WHERE id = 5;
```

- Login `james.carter@acmedemo.com` → **403** `This account has been deactivated.`
- ⚠️ Test ke baad waapas `is_active = TRUE` kar dena.

### S5. User Without Role → 403

```sql
UPDATE users SET role_id = NULL WHERE id = 5;
```

- Login → **403** `This account has no role assigned yet.`
- Test ke baad `role_id = 5` (EMPLOYEE) waapas set karo.

### S6. Missing Permission → 403

**EMPLOYEE** (`james.carter@acmedemo.com`) ke saath:

| Request | Result |
|---|---|
| `GET /api/contracts` | **403** |
| `GET /api/payruns` | **403** |
| `GET /api/departments` | **403** |
| `GET /api/employees` | **403** |
| `GET /api/auth/me` | **200** ✅ |
### GET `{{base_url}}/api/time-off-types` → `200`

### POST `{{base_url}}/api/time-off` (HR/ADMIN → `201`)

```json
{
  "employee_id": 5,
  "time_off_type_id": 1,
  "start_date": "2026-10-05",
  "end_date": "2026-10-07",
  "reason": "Personal leave"
}
```

- Overlapping pending/approved request → **409**

### POST `{{base_url}}/api/time-off/1/approve` (time_off:approve → HR_MANAGER/ADMIN)
### POST `{{base_url}}/api/time-off/1/reject`
  "pay_frequency": "monthly",
  "currency": "USD",
  "status": "draft"
}
```

**Negative tests:**
- end_date < start_date → **422**
- `reference_no` already exists (`CT-2022-001`) → **409**
- `employee_id: 99999` → **422**
- salary_structure_id wrong company → **422**

### PATCH `{{base_url}}/api/contracts/1`

```json
{ "salary_amount": 105000, "title": "Updated via Postman" }
```

### DELETE `{{base_url}}/api/contracts/1` → `204`
{
  "name": "Postman Schedule",
  "code": "PM-SCH-01",
  "work_days": ["MON", "TUE", "WED", "THU", "FRI"],
  "start_time": "09:00:00",
  "end_time": "17:30:00",
  "weekly_hours": 40
}
```
**Login Fail Cases:**

| Body | Expected |
|---|---|
| `{"email":"x@y.com","password":"wrong"}` | **401** `{"error":"Invalid email or password."}` |
| `{"email":"not-an-email","password":"abc"}` | **400** + issues array |
| Raw body empty / invalid JSON | **400** `Request body must be valid JSON.` |
    └── Finalized Payrun Immutable → 409
```
| # | Email | Role | Permissions |
|---|-------|------|-------------|
| 1 | `admin@acmedemo.com` | **ADMIN** | `*` (sab kuch) |
| 2 | `sarah.mitchell@acmedemo.com` | **HR_MANAGER** | `employees:*`, `attendance:*`, `time_off:approve`, `reports:read` |
| 3 | `david.lee@acmedemo.com` | **HR** | `employees:read`, `employees:write`, `attendance:read`, `time_off:write` |
| 4 | `maria.gomez@acmedemo.com` | **PAYROLL** | `payroll:*`, `salary_structures:read`, `reports:read` |
| 5 | `james.carter@acmedemo.com` | **EMPLOYEE** | `profile:read`, `attendance:read`, `time_off:create` |
| 6 | `priya.patel@acmedemo.com` | **EMPLOYEE** | `profile:read`, `attendance:read`, `time_off:create` |

> Seed data: 12 contracts, ~10 employees, schedules, salary structures, payruns available.