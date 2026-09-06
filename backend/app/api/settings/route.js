// app/api/settings/route.js
// System settings API: read and update company organization, general, and payroll security settings.

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { companies } from '@/lib/schema';

const defaultSettings = {
  organization: {
    companyName: 'Northstar Technologies Ltd.',
    legalName: 'Northstar Technologies India Private Limited',
    email: 'payroll@northstar.io',
    phone: '+91 (080) 4123-4567',
    website: 'https://northstar.io',
    taxId: 'GSTIN29ABCDE1234F1Z5',
    fiscalYearStart: '2026-04-01',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  },
  general: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    language: 'English (UK)',
    theme: 'Warm Linen',
    workingDaysPerWeek: 5,
    standardDailyHours: 8,
  },
  payrollSecurity: {
    cutoffDay: 25,
    overtimeMultiplier: 1.5,
    sessionTimeoutMinutes: 60,
    requireTwoFactor: true,
    autoPayslipEmail: true,
  },
  notifications: {
    notifyOnPayrunFinalize: true,
    notifyOnLeaveRequest: true,
    notifyOnContractExpiry: true,
    contractExpiryWarningDays: 30,
  },
};

let customSettingsStore = { ...defaultSettings };

async function getCompany() {
  const [company] = await db
    .select()
    .from(companies)
    .orderBy(companies.id)
    .limit(1);
  return company ?? null;
}

export async function GET() {
  const { error } = await requirePermission('dashboard:read');
  if (error) return error;

  try {
    const company = await getCompany();
    const organization = {
      companyName: company?.name || customSettingsStore.organization.companyName,
      legalName: company?.legalName || customSettingsStore.organization.legalName,
      email: company?.email || customSettingsStore.organization.email,
      phone: company?.phone || customSettingsStore.organization.phone,
      website: company?.logoUrl || customSettingsStore.organization.website,
      taxId: company?.taxId || customSettingsStore.organization.taxId,
      fiscalYearStart: customSettingsStore.organization.fiscalYearStart,
      currency: company?.currency || customSettingsStore.organization.currency,
      timezone: customSettingsStore.organization.timezone,
    };

    const fullSettings = {
      ...customSettingsStore,
      organization,
    };

    return NextResponse.json({
      settings: fullSettings,
      ...fullSettings,
    });
  } catch (err) {
    console.error('GET /api/settings failed:', err);
    return NextResponse.json({
      settings: customSettingsStore,
      ...customSettingsStore,
    });
  }
}

export async function PATCH(request) {
  const { error } = await requirePermission('payroll:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  try {
    const company = await getCompany();
    if (body.organization && company) {
      const org = body.organization;
      const updates = {};
      if (org.companyName) updates.name = org.companyName;
      if (org.legalName) updates.legalName = org.legalName;
      if (org.email) updates.email = org.email;
      if (org.phone) updates.phone = org.phone;
      if (org.currency) updates.currency = org.currency;
      if (org.taxId) updates.taxId = org.taxId;

      if (Object.keys(updates).length > 0) {
        await db.update(companies).set(updates).where(eq(companies.id, company.id));
      }
    }

    customSettingsStore = {
      organization: { ...customSettingsStore.organization, ...(body.organization || {}) },
      general: { ...customSettingsStore.general, ...(body.general || {}) },
      payrollSecurity: { ...customSettingsStore.payrollSecurity, ...(body.payrollSecurity || {}) },
      notifications: { ...customSettingsStore.notifications, ...(body.notifications || {}) },
    };

    return NextResponse.json({
      settings: customSettingsStore,
      ...customSettingsStore,
    });
  } catch (err) {
    console.error('PATCH /api/settings failed:', err);
    return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500 });
  }
}
