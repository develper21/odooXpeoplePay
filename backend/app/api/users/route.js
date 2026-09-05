// app/api/users/route.js
// POST /api/users — create an application-user account (ADMIN only).
//
// Introduced in the Phase 3 alignment: public self-registration via
// /api/auth/register was retired (410 Gone), so user accounts — and their
// role assignments — can only be created by an authenticated administrator.
//
// Contract (snake_case fields, mirroring the auth APIs):
//   Request JSON: { email, password, first_name, last_name, phone?, role_id }
//   201 → { user: { id, role_id, email, first_name, last_name, phone,
//                   is_active, last_login_at, created_at, updated_at } }
//   400 → { error, issues: [{ field, message }] } — payload missing/invalid
//   401 → { error }                               — not authenticated
//   403 → { error, permission }                   — missing 'users:create'
//   409 → { error }                               — email already registered
//   422 → { error }                               — role_id does not exist
//   405 → any other method
//
// Security notes:
// - Gate: requirePermission('users:create') (lib/auth-guard.js). No seeded
//   role carries this key, so today only ADMIN passes — via its '*'
//   wildcard. Other roles can be granted the key later without code changes.
// - Passwords are hashed with bcrypt (lib/auth.js) before they ever reach
//   the database; plaintext and SHA-256 are never stored.
// - The response is built from an explicit safe-field list, so password_hash
//   can never leak into a response.
// - Application-user accounts only: employees are NOT created or linked
//   here (that is later-phase work).

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashPassword } from '@/lib/auth';
import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { roles, users } from '@/lib/schema';

// Mirrors the users table constraints plus a sane password policy. bcrypt
// silently ignores input beyond 72 bytes, so the cap is enforced up front.
const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .pipe(z.email('A valid email address is required.')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .max(72, 'Password must be at most 72 characters long.')
    .regex(/[a-z]/, 'Password must contain a lowercase letter.')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
    .regex(/[0-9]/, 'Password must contain a digit.'),
  first_name: z.string().trim().min(1, 'First name is required.').max(100),
  last_name: z.string().trim().min(1, 'Last name is required.').max(100),
  phone: z.string().trim().max(30).optional().nullable(),
  role_id: z
    .number()
    .int('role_id must be an integer.')
    .positive('role_id must be a positive integer.'),
});

export async function POST(request) {
  // ADMIN-level gate first: never process unauthenticated payloads.
  const { error: authError } = await requirePermission('users:create');
  if (authError) return authError;

  // Malformed JSON is a client error (400), not a server error (500).
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid user payload.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const { email, password, first_name, last_name, phone, role_id } = parsed.data;

  try {
    // The selected role must exist before any account is written (422). Runs
    // before the (slow) bcrypt hash so bad requests stay cheap.
    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, role_id))
      .limit(1);
    if (!role) {
      return NextResponse.json({ error: `role_id ${role_id} does not exist.` }, { status: 422 });
    }

    // Duplicate emails get a friendly 409; the users_email_unique constraint
    // below still guards against concurrent creation races.
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // is_active defaults to true. `.returning()` lists only safe columns, so
    // password_hash is structurally excluded from the response.
    const [created] = await db
      .insert(users)
      .values({
        roleId: role_id,
        email,
        passwordHash,
        firstName: first_name,
        lastName: last_name,
        phone: phone || null,
        isActive: true,
      })
      .returning({
        id: users.id,
        role_id: users.roleId,
        email: users.email,
        first_name: users.firstName,
        last_name: users.lastName,
        phone: users.phone,
        is_active: users.isActive,
        last_login_at: users.lastLoginAt,
        created_at: users.createdAt,
        updated_at: users.updatedAt,
      });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    // Unique-violation fallback for concurrent duplicate creations.
    // Neon wraps the Postgres error in error.cause, so check both locations.
    const pgCode = error?.code ?? error?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(error?.message ?? '')) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }
    console.error('POST /api/users failed:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}