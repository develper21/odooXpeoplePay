// backend/app/api/users/[id]/route.js
// Individual user API: retrieve, update, and delete user accounts.

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { hashPassword } from '@/lib/auth';
import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { roles, users } from '@/lib/schema';

export async function GET(_request, { params }) {
  const { error } = await requirePermission('users:read');
  if (error) return error;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        role_id: users.roleId,
        role_code: roles.code,
        role_name: roles.name,
        email: users.email,
        first_name: users.firstName,
        last_name: users.lastName,
        phone: users.phone,
        is_active: users.isActive,
        last_login_at: users.lastLoginAt,
        created_at: users.createdAt,
        updated_at: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: `User ${userId} not found.` }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error('GET /api/users/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('users:write');
  if (error) return error;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: `User ${userId} not found.` }, { status: 404 });
    }

    const updates = {};
    if (body.first_name !== undefined || body.firstName !== undefined) {
      updates.firstName = body.first_name ?? body.firstName;
    }
    if (body.last_name !== undefined || body.lastName !== undefined) {
      updates.lastName = body.last_name ?? body.lastName;
    }
    if (body.phone !== undefined) {
      updates.phone = body.phone;
    }
    if (body.role_id !== undefined || body.roleId !== undefined) {
      updates.roleId = Number(body.role_id ?? body.roleId);
    }
    if (body.is_active !== undefined || body.isActive !== undefined) {
      updates.isActive = Boolean(body.is_active ?? body.isActive);
    }
    if (body.password) {
      updates.passwordHash = await hashPassword(body.password);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes provided.' });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
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

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error('PATCH /api/users/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('users:delete');
  if (error) return error;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: `User ${userId} not found.` }, { status: 404 });
    }

    // Soft delete / deactivate user to preserve integrity
    await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/users/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
