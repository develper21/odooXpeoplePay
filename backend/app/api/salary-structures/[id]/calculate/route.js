// backend/app/api/salary-structures/[id]/calculate/route.js
// Live simulation preview calculation for a salary structure.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { salaryRules, salaryStructures } from '@/lib/schema';

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function evaluateFormula(formula, scope) {
  try {
    // Basic arithmetic evaluation using scope
    const sanitized = formula.replace(/[A-Z0-9_]+/g, (match) => {
      const val = scope[match];
      return val !== undefined ? String(val) : '0';
    });
    // Safe evaluation of simple math without arbitrary JS
    if (/^[0-9+\-*/().\s]+$/.test(sanitized)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      return Number.isFinite(result) ? roundMoney(result) : 0;
    }
  } catch {
    return 0;
  }
  return 0;
}

export async function POST(request, { params }) {
  const { error } = await requirePermission('payroll:read');
  if (error) return error;

  const { id } = await params;
  const structureId = Number(id);
  if (!Number.isInteger(structureId) || structureId <= 0) {
    return NextResponse.json({ error: 'Invalid structure id.' }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const baseSalary = Number(body.baseSalary ?? body.baseWage ?? 50000);
  const inputs = body.inputs || {};

  try {
    const [structure] = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, structureId))
      .limit(1);

    if (!structure) {
      return NextResponse.json({ error: `Salary structure ${structureId} not found.` }, { status: 404 });
    }

    const rules = await db
      .select()
      .from(salaryRules)
      .where(eq(salaryRules.salaryStructureId, structureId))
      .orderBy(asc(salaryRules.computationOrder), asc(salaryRules.id));

    const scope = {
      BASE: baseSalary,
      BASIC: baseSalary,
      ...inputs,
    };

    const calculatedRules = [];
    const totals = {
      basic: baseSalary,
      allowances: 0,
      gross: baseSalary,
      deductions: 0,
      net: baseSalary,
    };

    for (const rule of rules) {
      let amount = 0;
      const calcType = rule.calculationType?.toLowerCase();

      if (calcType === 'fixed') {
        amount = Number(rule.amount ?? 0);
      } else if (calcType === 'percentage') {
        const pct = Number(rule.percentage ?? 0);
        const baseVal = rule.percentageBase === 'gross' ? totals.gross : (rule.percentageBase === 'net' ? totals.net : totals.basic);
        amount = roundMoney((baseVal * pct) / 100);
      } else if (calcType === 'formula') {
        const formulaStr = rule.formula || rule.description || '';
        const formulaScope = {
          ...scope,
          BASIC: totals.basic,
          GROSS: totals.gross,
          DEDUCTION: totals.deductions,
          DEDUCTIONS: totals.deductions,
          NET: totals.gross - totals.deductions,
        };
        amount = evaluateFormula(formulaStr, formulaScope);
      }

      scope[rule.code] = amount;

      const ruleType = rule.type?.toLowerCase();
      if (ruleType === 'earning' || ruleType === 'allowance') {
        if (rule.code.toUpperCase() === 'BASIC') {
          totals.basic = amount;
        } else {
          totals.allowances = roundMoney(totals.allowances + amount);
        }
      } else if (ruleType === 'deduction') {
        totals.deductions = roundMoney(totals.deductions + amount);
      }

      totals.gross = roundMoney(totals.basic + totals.allowances);
      totals.net = roundMoney(Math.max(0, totals.gross - totals.deductions));

      calculatedRules.push({
        ruleId: String(rule.id),
        code: rule.code,
        name: rule.name,
        category: rule.type?.toUpperCase(),
        sequence: rule.computationOrder ?? 1,
        computationType: rule.calculationType?.toUpperCase(),
        expressionDisplay: rule.calculationType === 'percentage' ? `${rule.percentage}% of ${rule.percentageBase}` : (rule.formula || `${amount}`),
        amount,
      });
    }

    return NextResponse.json({
      rules: calculatedRules,
      totals,
      errors: [],
      warnings: [],
    });
  } catch (err) {
    console.error('POST /api/salary-structures/:id/calculate failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
