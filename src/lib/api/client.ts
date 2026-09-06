const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

export function transformKeysToCamelCase<T>(data: any): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => transformKeysToCamelCase(item)) as unknown as T;
  }
  if (typeof data === "object" && data.constructor === Object) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const camelKey = toCamelCaseKey(key);
      result[camelKey] = transformKeysToCamelCase(value);
    }
    // Normalize IDs to string
    if (result.id !== undefined && typeof result.id === "number") {
      result.id = String(result.id);
    }
    if (result.employeeId !== undefined && typeof result.employeeId === "number") {
      result.employeeId = String(result.employeeId);
    }
    if (result.contractId !== undefined && typeof result.contractId === "number") {
      result.contractId = String(result.contractId);
    }
    if (result.scheduleId !== undefined && typeof result.scheduleId === "number") {
      result.scheduleId = String(result.scheduleId);
    }
    if (result.workingScheduleId !== undefined && result.scheduleId === undefined) {
      result.scheduleId = String(result.workingScheduleId);
    }
    if (result.salaryStructureId !== undefined && typeof result.salaryStructureId === "number") {
      result.salaryStructureId = String(result.salaryStructureId);
    }
    if (result.payrunId !== undefined && typeof result.payrunId === "number") {
      result.payrunId = String(result.payrunId);
    }
    if (result.timeOffTypeId !== undefined && result.typeId === undefined) {
      result.typeId = String(result.timeOffTypeId);
    }
    if (result.typeId !== undefined && typeof result.typeId === "number") {
      result.typeId = String(result.typeId);
    }
    if (result.allocationId !== undefined && typeof result.allocationId === "number") {
      result.allocationId = String(result.allocationId);
    }

    // Normalize status to UPPERCASE for unified UI badge/filter compatibility
    if (result.status && typeof result.status === "string") {
      result.status = result.status.toUpperCase();
    }

    // Normalize domain field aliases between backend schema and frontend components
    if (result.salaryAmount !== undefined && result.monthlySalary === undefined) {
      result.monthlySalary = Number(result.salaryAmount) || 0;
    }
    if (result.referenceNo !== undefined && result.reference === undefined) {
      result.reference = result.referenceNo;
    }
    if (result.netAmount !== undefined && result.net === undefined) {
      result.net = Number(result.netAmount) || 0;
    }
    if (result.grossAmount !== undefined && result.gross === undefined) {
      result.gross = Number(result.grossAmount) || 0;
    }
    if (result.deductionAmount !== undefined && result.deductions === undefined) {
      result.deductions = Number(result.deductionAmount) || 0;
    }
    if (result.daysRequested !== undefined && result.days === undefined) {
      result.days = Number(result.daysRequested) || 0;
    }
    if (result.employeeCode !== undefined && result.employeeNumber === undefined) {
      result.employeeNumber = result.employeeCode;
    }

    // Payrun & financial totals numeric normalization
    if (result.grossTotal !== undefined) result.grossTotal = Number(result.grossTotal) || 0;
    if (result.deductionTotal !== undefined) {
      result.deductionsTotal = Number(result.deductionTotal) || 0;
      result.deductionTotal = Number(result.deductionTotal) || 0;
    }
    if (result.deductionsTotal !== undefined) {
      result.deductionsTotal = Number(result.deductionsTotal) || 0;
    }
    if (result.netTotal !== undefined) result.netTotal = Number(result.netTotal) || 0;
    if (result.employerContributionTotal !== undefined) {
      result.employerContributionTotal = Number(result.employerContributionTotal) || 0;
    }
    if (result.employeeCount !== undefined) result.employeeCount = Number(result.employeeCount) || 0;

    if (result.gross !== undefined) result.gross = Number(result.gross) || 0;
    if (result.net !== undefined) result.net = Number(result.net) || 0;
    if (result.deductions !== undefined) result.deductions = Number(result.deductions) || 0;
    if (result.grossAmount !== undefined) result.grossAmount = Number(result.grossAmount) || 0;
    if (result.netAmount !== undefined) result.netAmount = Number(result.netAmount) || 0;
    if (result.deductionAmount !== undefined) result.deductionAmount = Number(result.deductionAmount) || 0;
    if (result.taxAmount !== undefined) result.taxAmount = Number(result.taxAmount) || 0;
    if (result.employerContributionAmount !== undefined) {
      result.employerContributionAmount = Number(result.employerContributionAmount) || 0;
    }
    if (result.paidDays !== undefined) result.paidDays = Number(result.paidDays) || 0;
    if (result.unpaidDays !== undefined) result.unpaidDays = Number(result.unpaidDays) || 0;
    if (result.overtimeAmount !== undefined) result.overtimeAmount = Number(result.overtimeAmount) || 0;
    if (result.monthlySalary !== undefined) result.monthlySalary = Number(result.monthlySalary) || 0;
    if (result.salaryAmount !== undefined) result.salaryAmount = Number(result.salaryAmount) || 0;

    // Attendance normalization
    if (result.attendanceDate !== undefined && result.date === undefined) {
      result.date = result.attendanceDate;
    }
    if (result.clockIn !== undefined && result.checkIn === undefined) {
      result.checkIn = typeof result.clockIn === "string" && result.clockIn.includes("T")
        ? result.clockIn.slice(11, 16)
        : (result.clockIn ? String(result.clockIn) : "09:00");
    }
    if (result.clockOut !== undefined && result.checkOut === undefined) {
      result.checkOut = typeof result.clockOut === "string" && result.clockOut.includes("T")
        ? result.clockOut.slice(11, 16)
        : (result.clockOut ? String(result.clockOut) : undefined);
    }
    if (result.breaksDurationMinutes !== undefined && result.breakMinutes === undefined) {
      result.breakMinutes = Number(result.breaksDurationMinutes) || 0;
    }
    if (result.workHours !== undefined && result.workedMinutes === undefined) {
      result.workedMinutes = Math.round((Number(result.workHours) || 0) * 60);
    }

    // Allocation normalization
    if (result.allocatedDays !== undefined) {
      result.allocatedDays = Number(result.allocatedDays) || 0;
    }
    if (result.usedDays !== undefined) {
      result.usedDays = Number(result.usedDays) || 0;
    }
    if (result.remainingDays !== undefined) {
      result.remainingDays = Number(result.remainingDays) || 0;
    }
    if (result.effectiveFrom !== undefined && result.validFrom === undefined) {
      result.validFrom = result.effectiveFrom;
    }
    if (result.effectiveTo !== undefined && result.validTo === undefined) {
      result.validTo = result.effectiveTo || "";
    }
    if (!result.type && result.timeOffType && typeof result.timeOffType === "object" && result.timeOffType.name) {
      result.type = result.timeOffType.name;
    }

    // Schedule days array normalization
    if (!result.days && result.workDays && Array.isArray(result.workDays)) {
      const daysOfWeek = [
        { key: "MON", label: "Monday" },
        { key: "TUE", label: "Tuesday" },
        { key: "WED", label: "Wednesday" },
        { key: "THU", label: "Thursday" },
        { key: "FRI", label: "Friday" },
        { key: "SAT", label: "Saturday" },
        { key: "SUN", label: "Sunday" },
      ];
      const activeSet = new Set(result.workDays.map((d: any) => String(d).toUpperCase()));
      const sTime = result.startTime ? String(result.startTime).slice(0, 5) : "09:00";
      const eTime = result.endTime ? String(result.endTime).slice(0, 5) : "17:00";
      result.days = daysOfWeek.map((d) => ({
        day: d.label,
        enabled: activeSet.has(d.key),
        startTime: sTime,
        endTime: eTime,
        breakMinutes: 60,
      }));
    } else if (!Array.isArray(result.days) && (result.weeklyHours !== undefined || result.timezone !== undefined)) {
      result.days = [];
    }

    // Payrun reference and period normalization
    if (result.payPeriodStart !== undefined && result.periodStart === undefined) {
      result.periodStart = result.payPeriodStart;
    }
    if (result.payPeriodEnd !== undefined && result.periodEnd === undefined) {
      result.periodEnd = result.payPeriodEnd;
    }
    if (!result.reference && result.id && (result.payPeriodStart !== undefined || result.grossTotal !== undefined)) {
      result.reference = `PR-${String(result.id).padStart(3, "0")}`;
    }
    if (!result.period && result.periodStart) {
      const pDate = new Date(result.periodStart);
      if (!isNaN(pDate.getTime())) {
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        result.period = `${monthNames[pDate.getUTCMonth()]} ${pDate.getUTCFullYear()}`;
      }
    } else if (!result.period && result.name) {
      const m = String(result.name).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i);
      if (m) result.period = m[0];
    }

    // Payslip reference fallback
    if (!result.reference && result.id && (result.net !== undefined || result.gross !== undefined)) {
      result.reference = `PSL-${String(result.id).padStart(3, "0")}`;
    }

    // Payslip line item normalization
    if (result.salaryRuleId !== undefined && result.ruleId === undefined) {
      result.ruleId = String(result.salaryRuleId);
    }
    if (result.sortOrder !== undefined && result.sequence === undefined) {
      result.sequence = Number(result.sortOrder);
    }
    if (result.amount !== undefined && typeof result.amount === "string" && !isNaN(Number(result.amount))) {
      result.amount = Number(result.amount);
    }

    // Salary Rule normalization
    if (result.computationOrder !== undefined && result.sequence === undefined) {
      result.sequence = Number(result.computationOrder);
    }
    if (result.calculationType !== undefined && result.computationType === undefined) {
      result.computationType = String(result.calculationType).toUpperCase();
    }
    if (!result.category) {
      const codeUpper = String(result.code || "").toUpperCase();
      if (codeUpper === "BASIC") result.category = "BASIC";
      else if (codeUpper === "GROSS") result.category = "GROSS";
      else if (codeUpper === "NET") result.category = "NET";
      else if (result.type === "earning" || result.type === "EARNING") result.category = "ALLOWANCE";
      else if (result.type === "deduction" || result.type === "DEDUCTION") result.category = "DEDUCTION";
      else result.category = "ALLOWANCE";
    }
    if (result.percentage !== undefined && typeof result.percentage === "string") {
      result.percentage = Number(result.percentage) || 0;
    }
    if (result.amount !== undefined && typeof result.amount === "string") {
      result.amount = Number(result.amount) || 0;
    }
    if (result.percentageBase && !result.basedOn) {
      result.basedOn = [String(result.percentageBase).toUpperCase()];
    }
    if (result.sequence === undefined) {
      result.sequence = 1;
    }
    if (!result.status && result.isActive !== undefined) {
      result.status = result.isActive ? "ACTIVE" : "INACTIVE";
    }

    // User full name and role normalization
    if (!result.name && (result.firstName || result.lastName)) {
      result.name = `${result.firstName || ""} ${result.lastName || ""}`.trim();
    }
    if (!result.role) {
      if (result.roleCode) {
        result.role = String(result.roleCode).toUpperCase();
      } else if (result.roleId !== undefined) {
        const idToRole: Record<number, string> = {
          1: "ADMIN",
          2: "HR_MANAGER",
          3: "HR_PAYROLL_MANAGER",
          4: "HR_PAYROLL_USER",
          5: "EMPLOYEE",
        };
        result.role = idToRole[Number(result.roleId)] || "EMPLOYEE";
      }
    }

    // Salary structure ruleIds normalization
    if (result.rules !== undefined && Array.isArray(result.rules)) {
      result.ruleIds = result.rules.map((r: any) => String(r.id || r));
    } else if (!Array.isArray(result.ruleIds) && (result.payFrequency !== undefined || result.currency !== undefined)) {
      result.ruleIds = [];
    }

    return result as T;
  }
  return data;
}

function toSnakeCaseKey(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

const deptNameToId: Record<string, number> = {
  engineering: 1,
  eng: 1,
  people: 2,
  hr: 2,
  operations: 3,
  ops: 3,
  finance: 4,
  fin: 4,
  sales: 5,
  sls: 5,
  marketing: 6,
  mkt: 6,
  administration: 7,
  adm: 7,
};

const roleNameToId: Record<string, number> = {
  admin: 1,
  administrator: 1,
  hr_manager: 2,
  hr_officer: 2,
  hr_payroll_manager: 3,
  payroll_manager: 3,
  hr_payroll_user: 4,
  payroll_officer: 4,
  employee: 5,
};

export function transformPayloadToBackend(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(transformPayloadToBackend);
  }
  if (typeof data === "object" && data.constructor === Object) {
    const result: Record<string, any> = {};

    // Special pre-handling for Employee payload
    if (data.employeeNumber && !data.employee_code) {
      result["employee_code"] = data.employeeNumber;
    }
    if (data.joinedOn && !data.hire_date) {
      result["hire_date"] = data.joinedOn;
    }
    if (data.department && !data.department_id) {
      const dName = String(data.department).toLowerCase();
      result["department_id"] = deptNameToId[dName] || 1;
    }
    if (data.position && !data.job_position_id) {
      result["job_position_id"] = 1;
    }

    // Special pre-handling for WorkingSchedule payload
    if (data.days && Array.isArray(data.days) && !data.work_days) {
      const dayMap: Record<string, string> = {
        monday: "MON",
        tuesday: "TUE",
        wednesday: "WED",
        thursday: "THU",
        friday: "FRI",
        saturday: "SAT",
        sunday: "SUN",
      };
      const activeDays = data.days.filter((d: any) => d.enabled);
      result["work_days"] = activeDays.map((d: any) => dayMap[String(d.day).toLowerCase()] || "MON");
      if (activeDays[0]) {
        result["start_time"] = activeDays[0].startTime?.length === 5 ? `${activeDays[0].startTime}:00` : activeDays[0].startTime;
        result["end_time"] = activeDays[0].endTime?.length === 5 ? `${activeDays[0].endTime}:00` : activeDays[0].endTime;
      }
      if (!data.code && data.name) {
        result["code"] = String(data.name).trim().toUpperCase().replace(/\s+/g, "_").slice(0, 30);
      }
      result["is_flexible"] = data.type === "FLEXIBLE";
    }

    // Special pre-handling for Contract payload
    if (data.monthlySalary !== undefined || data.salaryAmount !== undefined) {
      if (!data.contract_type && !data.contractType) {
        result["contract_type"] = "permanent";
      }
      if (!data.currency) {
        result["currency"] = "INR";
      }
      if (!data.job_position_id && !data.jobPositionId) {
        result["job_position_id"] = 1;
      }
      if (!data.reference_no && !data.reference) {
        result["reference_no"] = `CNT-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    // Special pre-handling for User payload
    if (data.role && !data.role_id) {
      const rKey = String(data.role).toLowerCase();
      result["role_id"] = roleNameToId[rKey] || 5;
    }
    if (data.name && (!data.first_name || !data.lastName)) {
      const parts = String(data.name).trim().split(/\s+/);
      result["first_name"] = parts[0] || "User";
      result["last_name"] = parts.slice(1).join(" ") || "Account";
    }
    if (!data.password && (data.email || data.role)) {
      result["password"] = "Password123!";
    }

    // Special pre-handling for SalaryRule payload
    if ((data.code || data.calculationType) && !data.salary_structure_id && !data.salaryStructureId) {
      result["salary_structure_id"] = 1;
    }

    // Special pre-handling for Payrun payload
    if (data.selectedEmployeeIds && !data.employee_ids) {
      result["employee_ids"] = data.selectedEmployeeIds.map((idVal: any) =>
        typeof idVal === "string" && /^\d+$/.test(idVal) ? Number(idVal) : idVal
      );
    }
    if (data.periodEnd && !data.payment_date) {
      result["payment_date"] = data.periodEnd;
    }

    for (const [key, value] of Object.entries(data)) {
      let targetKey = toSnakeCaseKey(key);

      // Domain property alias mappings
      if (key === "employeeNumber") targetKey = "employee_code";
      else if (key === "joinedOn") targetKey = "hire_date";
      else if (key === "monthlySalary") targetKey = "salary_amount";
      else if (key === "reference") targetKey = "reference_no";
      else if (key === "net") targetKey = "net_amount";
      else if (key === "gross") targetKey = "gross_amount";
      else if (key === "deductions") targetKey = "deduction_amount";
      else if (key === "days") targetKey = "days_requested";
      else if (key === "scheduleId" || key === "workingScheduleId") targetKey = "working_schedule_id";
      else if (key === "typeId" || key === "timeOffTypeId") targetKey = "time_off_type_id";
      else if (key === "validFrom") targetKey = "effective_from";
      else if (key === "validTo") targetKey = "effective_to";
      else if (key === "ruleIds") targetKey = "rule_ids";
      else if (key === "employeeType") targetKey = "employment_type";
      else if (key === "periodStart" || key === "payPeriodStart") targetKey = "pay_period_start";
      else if (key === "periodEnd" || key === "payPeriodEnd") targetKey = "pay_period_end";
      else if (key === "startDate") targetKey = "start_date";
      else if (key === "endDate") targetKey = "end_date";
      else if (key === "paymentDate") targetKey = "payment_date";
      else if (key === "selectedEmployeeIds" || key === "employeeIds") targetKey = "employee_ids";

      let targetVal = transformPayloadToBackend(value);

      // Value normalizations
      if (key === "status" && typeof targetVal === "string") {
        targetVal = targetVal.toLowerCase();
      } else if (
        (key === "employeeType" || key === "employmentType" || targetKey === "employment_type") &&
        typeof targetVal === "string"
      ) {
        targetVal = targetVal.toLowerCase();
      } else if (key === "payFrequency" && typeof targetVal === "string") {
        targetVal = targetVal.toLowerCase();
      } else if (key === "calculationType" && typeof targetVal === "string") {
        targetVal = targetVal.toLowerCase();
      } else if (
        key === "type" &&
        typeof targetVal === "string" &&
        ["EARNING", "DEDUCTION"].includes(targetVal.toUpperCase())
      ) {
        targetVal = targetVal.toLowerCase();
      }

      // Ensure numeric integer IDs
      if (
        [
          "employee_id",
          "department_id",
          "job_position_id",
          "working_schedule_id",
          "salary_structure_id",
          "time_off_type_id",
          "allocation_id",
          "manager_id",
          "user_id",
        ].includes(targetKey) &&
        typeof targetVal === "string" &&
        /^\d+$/.test(targetVal)
      ) {
        targetVal = Number(targetVal);
      }

      // Convert rule_ids from string[] to number[] if numeric
      if (targetKey === "rule_ids" && Array.isArray(targetVal)) {
        targetVal = targetVal.map((idVal: any) =>
          typeof idVal === "string" && /^\d+$/.test(idVal) ? Number(idVal) : idVal
        );
      }

      result[targetKey] = targetVal;
    }

    return result;
  }
  return data;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let processedBody = init?.body;
  if (init?.body && typeof init.body === "string") {
    try {
      const parsed = JSON.parse(init.body);
      const transformed = transformPayloadToBackend(parsed);
      processedBody = JSON.stringify(transformed);
    } catch {
      // Body was not JSON string
    }
  }

  const response = await fetch(url, {
    ...init,
    body: processedBody,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let errMsg = `API request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error) errMsg = errData.error;
      else if (errData?.message) errMsg = errData.message;
    } catch {
      // Keep status message
    }
    throw new Error(errMsg);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const json = await response.json();

  // Automatic envelope unwrapping for backend collection responses
  const transformed = transformKeysToCamelCase<any>(json);
  if (transformed && typeof transformed === "object") {
    // If unwrapping a single key envelope
    const keys = Object.keys(transformed);
    const envelopeKeys = [
      "employees", "contracts", "schedules", "attendance", "attendances",
      "allocations", "timeOffRequests", "timeOff", "timeOffTypes",
      "salaryStructures", "salaryRules", "payruns", "payslips", "users", "roles"
    ];
    for (const envKey of envelopeKeys) {
      if (Array.isArray(transformed[envKey])) {
        return transformed[envKey] as T;
      }
    }

    // Single item unwraps (e.g. { employee: {...} }, { user: {...} }, { contract: {...} })
    const singleKeys = [
      "employee",
      "contract",
      "schedule",
      "attendance",
      "allocation",
      "timeOffRequest",
      "salaryStructure",
      "salaryRule",
      "payrun",
      "payslip",
      "user",
      "role",
      "company",
    ];
    for (const sKey of singleKeys) {
      if (transformed[sKey] && typeof transformed[sKey] === "object") {
        const nestedItem = transformed[sKey];
        if (nestedItem.id !== undefined || keys.length <= 4) {
          return {
            ...transformed,
            ...nestedItem,
            id: nestedItem.id ? String(nestedItem.id) : (transformed.id ? String(transformed.id) : undefined),
          } as T;
        }
      }
    }
  }

  return transformed as T;
}

export async function apiBlob(path: string, init?: RequestInit): Promise<Blob> {
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("You are not authorized to access this resource.");
    if (response.status === 404) throw new Error("Requested resource was not found.");
    throw new Error(`Download failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error("The received file response was empty.");
  return blob;
}

export const apiResource = <T>(path: string) => ({
  list: () => apiClient<T[]>(path),
  get: (id: string) => apiClient<T>(`${path}/${id}`),
  create: (input: Partial<T>) => apiClient<T>(path, { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: Partial<T>) => apiClient<T>(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiClient<void>(`${path}/${id}`, { method: "DELETE" }),
});
