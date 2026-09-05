// POST /api/payslips/:id/generate
// The route id is the source payrun id; employee_id is supplied in the body.

import { generatePayslip } from '@/app/api/payslips/route';

export const POST = generatePayslip;
