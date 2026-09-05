import { apiClient } from "@/lib/api/client";
import { dataMode } from "@/lib/data-mode";
import { listMock, updateMock } from "@/lib/services/mock-store";
import { calculateSalary, sortRulesBySequence } from "@/lib/salary-calculator";
import type {
  AttendanceRecord,
  Contract,
  Payrun,
  Payslip,
  PayslipLine,
  PayrunWarning,
} from "@/types/domain";

/**
 * Resolves the applicable contract for an employee during the given payrun period.
 * 
 * Business rule:
 * - The contract must cover the payrun period: startDate <= periodEnd && (!endDate || endDate >= periodStart).
 * - Prefers ACTIVE status.
 * - Handles historical contract transitions (e.g. 2025 vs 2026 contracts).
 */
export function findApplicableContract(
  employeeId: string,
  periodStart: string,
  periodEnd: string,
  contracts: Contract[]
): {
  contract?: Contract;
  issue?: "MISSING" | "EXPIRED" | "CONFLICT" | "NOT_VALID_FOR_PERIOD";
  allMatching?: Contract[];
} {
  const empContracts = contracts.filter((c) => c.employeeId === employeeId);
  if (empContracts.length === 0) {
    return { issue: "MISSING" };
  }

  // Find contracts that overlap with the period
  const overlapping = empContracts.filter((c) => {
    const startMatches = !c.startDate || c.startDate <= periodEnd;
    const endMatches = !c.endDate || c.endDate >= periodStart;
    return startMatches && endMatches;
  });

  if (overlapping.length === 0) {
    // Check if employee has any active contract at all
    const activeContract = empContracts.find((c) => c.status === "ACTIVE");
    if (!activeContract) {
      return { issue: "EXPIRED" };
    }
    return { issue: "NOT_VALID_FOR_PERIOD" };
  }

  // If there's an active overlapping contract, prefer it
  const activeOverlapping = overlapping.filter((c) => c.status === "ACTIVE");
  if (activeOverlapping.length === 1) {
    return { contract: activeOverlapping[0] };
  }

  if (activeOverlapping.length > 1) {
    // Sort by startDate descending to find the latest valid contract
    activeOverlapping.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
    return { contract: activeOverlapping[0], allMatching: activeOverlapping };
  }

  // None active, but some overlap (e.g., terminated/draft/expired)
  return { contract: overlapping[0], issue: "NOT_VALID_FOR_PERIOD", allMatching: overlapping };
}

/**
 * Computes worked days from attendance records for a specific employee within a period.
 */
export function computeWorkedDays(
  employeeId: string,
  periodStart: string,
  periodEnd: string,
  attendance: AttendanceRecord[]
): number {
  const empAttendance = attendance.filter((a) => {
    return (
      a.employeeId === employeeId &&
      a.date >= periodStart &&
      a.date <= periodEnd &&
      (a.status === "PRESENT" ||
        a.status === "LATE" ||
        a.status === "OVERTIME" ||
        a.status === "MANUAL_EDIT")
    );
  });

  // If attendance records exist for this period, count distinct dates
  if (empAttendance.length > 0) {
    const distinctDates = new Set(empAttendance.map((a) => a.date));
    return distinctDates.size;
  }

  // Standard business month default worked days
  return 22;
}

/**
 * Full Payrun Computation Engine
 */
export async function computePayrun(payrunId: string): Promise<Payrun> {
  if (dataMode === "api") {
    return apiClient<Payrun>(`/payruns/${payrunId}/compute`, { method: "POST" });
  }

  const payruns = listMock("payruns");
  const payrun = payruns.find((p) => p.id === payrunId);
  if (!payrun) {
    throw new Error(`Payrun with ID ${payrunId} not found.`);
  }

  const allEmployees = listMock("employees");
  const allContracts = listMock("contracts");
  const allStructures = listMock("salaryStructures");
  const allRules = listMock("salaryRules");
  const allAttendance = listMock("attendance");
  const existingPayslips = listMock("payslips");

  // Determine target employees
  const targetEmployeeIds = payrun.selectedEmployeeIds && payrun.selectedEmployeeIds.length > 0
    ? payrun.selectedEmployeeIds
    : allEmployees.filter((e) => e.status === "ACTIVE").map((e) => e.id);

  // Period dates fallback
  const periodStart = payrun.periodStart || "2026-09-01";
  const periodEnd = payrun.periodEnd || "2026-09-30";

  // Determine Salary Structure
  const structureId = payrun.salaryStructureId || "ss-001";
  const structure = allStructures.find((s) => s.id === structureId);
  if (!structure) {
    throw new Error(`Salary Structure with ID ${structureId} not found.`);
  }

  // Load Structure Rules
  const structureRules = allRules.filter((r) => structure.ruleIds.includes(r.id) && r.status === "ACTIVE");
  const sortedRules = sortRulesBySequence(structureRules);

  const generatedPayslips: Payslip[] = [];
  const payrunWarnings: PayrunWarning[] = [];

  let payrunGrossTotal = 0;
  let payrunDeductionsTotal = 0;
  let payrunNetTotal = 0;

  for (const empId of targetEmployeeIds) {
    const emp = allEmployees.find((e) => e.id === empId);
    if (!emp) continue;

    const empName = `${emp.firstName} ${emp.lastName}`;
    const employeeWarnings: PayrunWarning[] = [];

    // 1. Bank details check
    if (!emp.bankAccount || emp.bankAccount.trim() === "") {
      const warning: PayrunWarning = {
        id: `warn-${empId}-bank-${Date.now()}`,
        type: "MISSING_BANK_DETAILS",
        severity: "WARNING",
        message: `${empName} is missing bank details. Payment cannot be dispatched to bank.`,
        employeeId: emp.id,
        employeeName: empName,
        blocking: false,
      };
      employeeWarnings.push(warning);
      payrunWarnings.push(warning);
    }

    // 2. Applicable Contract Check
    const contractResult = findApplicableContract(emp.id, periodStart, periodEnd, allContracts);
    const applicableContract = contractResult.contract;

    if (!applicableContract) {
      const warning: PayrunWarning = {
        id: `warn-${empId}-nocontract-${Date.now()}`,
        type: "MISSING_ACTIVE_CONTRACT",
        severity: "ERROR",
        message: `${empName} has no valid contract covering period ${payrun.period}.`,
        employeeId: emp.id,
        employeeName: empName,
        blocking: true,
      };
      employeeWarnings.push(warning);
      payrunWarnings.push(warning);
    } else if (applicableContract.status !== "ACTIVE" || contractResult.issue === "NOT_VALID_FOR_PERIOD") {
      const warning: PayrunWarning = {
        id: `warn-${empId}-contractperiod-${Date.now()}`,
        type: "CONTRACT_NOT_VALID_FOR_PERIOD",
        severity: "ERROR",
        message: `${empName}'s contract (${applicableContract.reference}) is not active or valid for period ${payrun.period}.`,
        employeeId: emp.id,
        employeeName: empName,
        blocking: true,
      };
      employeeWarnings.push(warning);
      payrunWarnings.push(warning);
    }

    // 3. Duplicate Payslip Check in other Payruns
    const hasDuplicate = existingPayslips.some(
      (p) => p.employeeId === emp.id && p.period === payrun.period && p.payrunId !== payrun.id
    );
    if (hasDuplicate) {
      const warning: PayrunWarning = {
        id: `warn-${empId}-dup-${Date.now()}`,
        type: "DUPLICATE_PAYSLIP",
        severity: "WARNING",
        message: `Duplicate payslip detected for ${empName} in period ${payrun.period} under another payrun.`,
        employeeId: emp.id,
        employeeName: empName,
        blocking: false,
      };
      employeeWarnings.push(warning);
      payrunWarnings.push(warning);
    }

    // 4. Calculate Worked Days
    const workedDays = computeWorkedDays(emp.id, periodStart, periodEnd, allAttendance);

    // 5. Calculate Salary using Sprint 6 Engine
    const baseSalary = applicableContract?.monthlySalary || 0;
    const calcResult = calculateSalary(sortedRules, {
      baseSalary,
      employeeId: emp.id,
      contractId: applicableContract?.id,
      workedDays,
      totalDays: 30,
      period: payrun.period,
    });

    if (calcResult.errors.length > 0) {
      for (const err of calcResult.errors) {
        const warning: PayrunWarning = {
          id: `warn-${empId}-calc-${Date.now()}-${Math.random()}`,
          type: "CALCULATION_ERROR",
          severity: "ERROR",
          message: `Calculation error for ${empName}: ${err}`,
          employeeId: emp.id,
          employeeName: empName,
          blocking: true,
        };
        employeeWarnings.push(warning);
        payrunWarnings.push(warning);
      }
    }

    // Map Rule Lines
    const lines: PayslipLine[] = calcResult.rules.map((r) => ({
      ruleId: r.ruleId,
      sequence: r.sequence,
      code: r.code,
      name: r.name,
      category: r.category,
      amount: r.amount,
      calculationDisplay: r.expressionDisplay,
    }));

    const payslipRef = `PS-${payrun.reference || payrun.period.replace(/\s+/g, "")}-${emp.employeeNumber || emp.id}`;
    const payslipId = `ps-${payrun.id}-${emp.id}`;

    const newPayslip: Payslip = {
      id: payslipId,
      payrunId: payrun.id,
      employeeId: emp.id,
      reference: payslipRef,
      contractId: applicableContract?.id,
      salaryStructureId: structure.id,
      period: payrun.period,
      periodStart,
      periodEnd,
      workedDays,
      basicTotal: calcResult.totals.basic,
      allowancesTotal: calcResult.totals.allowances,
      gross: calcResult.totals.gross,
      deductions: calcResult.totals.deductions,
      net: calcResult.totals.net,
      status: "COMPUTED",
      deliveryStatus: "PENDING",
      lines,
      warnings: employeeWarnings,
    };

    generatedPayslips.push(newPayslip);

    payrunGrossTotal += calcResult.totals.gross;
    payrunDeductionsTotal += calcResult.totals.deductions;
    payrunNetTotal += calcResult.totals.net;
  }

  // Update Payslips in mockStore (remove existing for this payrun and insert newly computed)
  const otherPayslips = existingPayslips.filter((p) => p.payrunId !== payrun.id);
  const updatedAllPayslips = [...otherPayslips, ...generatedPayslips];

  // Directly update mockStore.payslips array
  const allPayslipsRef = listMock("payslips");
  allPayslipsRef.length = 0;
  allPayslipsRef.push(...updatedAllPayslips);

  const updatedPayrun = updateMock("payruns", payrun.id, {
    employeeCount: targetEmployeeIds.length,
    selectedEmployeeIds: targetEmployeeIds,
    grossTotal: payrunGrossTotal,
    deductionsTotal: payrunDeductionsTotal,
    netTotal: payrunNetTotal,
    status: "COMPUTED",
    warnings: payrunWarnings,
    computedAt: new Date().toISOString(),
  });

  return updatedPayrun;
}

/**
 * Validate Payrun
 * Checks for blocking errors and transitions state to VALIDATED.
 */
export async function validatePayrun(payrunId: string): Promise<Payrun> {
  if (dataMode === "api") {
    return apiClient<Payrun>(`/payruns/${payrunId}/validate`, { method: "POST" });
  }

  const payruns = listMock("payruns");
  const payrun = payruns.find((p) => p.id === payrunId);
  if (!payrun) {
    throw new Error(`Payrun with ID ${payrunId} not found.`);
  }

  if (payrun.status !== "COMPUTED" && payrun.status !== "WARNING" && payrun.status !== "PENDING_APPROVAL") {
    throw new Error(`Cannot validate payrun in status ${payrun.status}. Please compute first.`);
  }

  const allPayslips = listMock("payslips");
  const payrunPayslips = allPayslips.filter((p) => p.payrunId === payrun.id);
  if (payrunPayslips.length === 0) {
    throw new Error("Cannot validate payrun with 0 payslips. Please compute the payrun first.");
  }

  // Check for blocking errors
  const blockingWarnings = (payrun.warnings || []).filter((w) => w.severity === "ERROR" || w.blocking);
  if (blockingWarnings.length > 0) {
    const issues = blockingWarnings.map((w) => `• ${w.message}`).join("\n");
    throw new Error(`Validation blocked by ${blockingWarnings.length} unresolved error(s):\n${issues}`);
  }

  // Update Payrun and Payslips
  for (const payslip of payrunPayslips) {
    updateMock("payslips", payslip.id, { status: "VALIDATED" });
  }

  return updateMock("payruns", payrun.id, {
    status: "VALIDATED",
    validatedAt: new Date().toISOString(),
  });
}

/**
 * Mark Payrun as Paid
 * Finalizes payroll and transitions Payrun and Payslips to PAID.
 */
export async function markPayrunPaid(payrunId: string): Promise<Payrun> {
  if (dataMode === "api") {
    return apiClient<Payrun>(`/payruns/${payrunId}/paid`, { method: "POST" });
  }

  const payruns = listMock("payruns");
  const payrun = payruns.find((p) => p.id === payrunId);
  if (!payrun) {
    throw new Error(`Payrun with ID ${payrunId} not found.`);
  }

  if (payrun.status !== "VALIDATED") {
    throw new Error(`Cannot mark payrun as paid. Payrun must be VALIDATED first (current status: ${payrun.status}).`);
  }

  const now = new Date().toISOString();
  const allPayslips = listMock("payslips");
  const payrunPayslips = allPayslips.filter((p) => p.payrunId === payrun.id);

  for (const payslip of payrunPayslips) {
    updateMock("payslips", payslip.id, {
      status: "PAID",
      paidAt: now,
    });
  }

  return updateMock("payruns", payrun.id, {
    status: "PAID",
    paidAt: now,
  });
}

/**
 * Send Payslips (Mock Bulk Dispatch)
 * Simulates email delivery, detects missing email addresses, marks sent payslips as SENT.
 */
export async function sendPayrunPayslips(payrunId: string): Promise<{
  total: number;
  sentCount: number;
  failedCount: number;
  failures: { employeeName: string; reason: string }[];
  simulated?: boolean;
}> {
  if (dataMode === "api") {
    return apiClient(`/payruns/${payrunId}/send-payslips`, { method: "POST" });
  }

  const payruns = listMock("payruns");
  const payrun = payruns.find((p) => p.id === payrunId);
  if (!payrun) {
    throw new Error(`Payrun with ID ${payrunId} not found.`);
  }

  if (payrun.status !== "PAID") {
    throw new Error("Payslips can only be sent after the payrun is marked as paid.");
  }

  const allPayslips = listMock("payslips");
  const allEmployees = listMock("employees");
  const payrunPayslips = allPayslips.filter((p) => p.payrunId === payrun.id);

  if (payrunPayslips.length === 0) {
    throw new Error("No payslips available to send for this payrun.");
  }

  let sentCount = 0;
  let failedCount = 0;
  const failures: { employeeName: string; reason: string }[] = [];
  const now = new Date().toISOString();

  for (const payslip of payrunPayslips) {
    const emp = allEmployees.find((e) => e.id === payslip.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : `Employee ${payslip.employeeId}`;

    if (!emp || !emp.email || !emp.email.includes("@")) {
      failedCount++;
      failures.push({
        employeeName: empName,
        reason: "Cannot send payslip — missing or invalid email address.",
      });
      updateMock("payslips", payslip.id, {
        deliveryStatus: "FAILED",
        deliveryError: "Email address missing or invalid.",
      });
      continue;
    }

    updateMock("payslips", payslip.id, {
      deliveryStatus: "SENT",
      deliveryError: undefined,
      sentAt: now,
    });
    sentCount++;
  }

  return {
    total: payrunPayslips.length,
    sentCount,
    failedCount,
    failures,
    simulated: true,
  };
}
