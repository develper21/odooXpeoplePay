CREATE TYPE "public"."allocation_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."attendance_source" AS ENUM('manual', 'device', 'mobile', 'import');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'remote');--> statement-breakpoint
CREATE TYPE "public"."calculation_base" AS ENUM('gross', 'basic', 'net');--> statement-breakpoint
CREATE TYPE "public"."calculation_type" AS ENUM('fixed', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('draft', 'active', 'expired', 'terminated', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('permanent', 'fixed_term', 'internship', 'probation', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'probation', 'on_leave', 'suspended', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'intern', 'temporary');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."general_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('single', 'married', 'divorced', 'widowed', 'other');--> statement-breakpoint
CREATE TYPE "public"."pay_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'check', 'cash', 'other');--> statement-breakpoint
CREATE TYPE "public"."payrun_status" AS ENUM('draft', 'processing', 'approved', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payslip_status" AS ENUM('draft', 'processing', 'approved', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."salary_rule_type" AS ENUM('earning', 'deduction', 'employer_contribution');--> statement-breakpoint
CREATE TYPE "public"."time_off_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"time_off_type_id" integer NOT NULL,
	"period_year" integer NOT NULL,
	"entitled_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"allocated_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"carried_over_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"additional_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"used_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"pending_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"remaining_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" "allocation_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"working_schedule_id" integer,
	"attendance_date" date NOT NULL,
	"clock_in" timestamp with time zone,
	"clock_out" timestamp with time zone,
	"breaks_duration_minutes" integer DEFAULT 0 NOT NULL,
	"work_hours" numeric(5, 2),
	"overtime_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"source" "attendance_source" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"approved_by_id" integer,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_company_id" integer,
	"name" varchar(200) NOT NULL,
	"legal_name" varchar(200),
	"tax_id" varchar(50),
	"email" varchar(255),
	"phone" varchar(30),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"logo_url" varchar(500),
	"status" "general_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_tax_id_unique" UNIQUE("tax_id")
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"job_position_id" integer,
	"working_schedule_id" integer,
	"salary_structure_id" integer,
	"contract_type" "contract_type" NOT NULL,
	"title" varchar(200),
	"reference_no" varchar(100),
	"start_date" date NOT NULL,
	"end_date" date,
	"probation_end_date" date,
	"notice_period_days" integer,
	"salary_amount" numeric(14, 2) NOT NULL,
	"pay_frequency" "pay_frequency" DEFAULT 'monthly' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"terms" text,
	"document_url" varchar(500),
	"signed_on" date,
	"status" "contract_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_reference_no_unique" UNIQUE("reference_no"),
	CONSTRAINT "chk_contract_end_after_start" CHECK ("contracts"."end_date" >= "contracts"."start_date")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"parent_id" integer,
	"manager_id" integer,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"status" "general_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"company_id" integer NOT NULL,
	"department_id" integer,
	"job_position_id" integer,
	"manager_id" integer,
	"employee_code" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"gender" "gender",
	"date_of_birth" date,
	"nationality" varchar(100),
	"marital_status" "marital_status",
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"hire_date" date NOT NULL,
	"termination_date" date,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"profile_image_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "job_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"department_id" integer,
	"title" varchar(200) NOT NULL,
	"code" varchar(50) NOT NULL,
	"level" varchar(50),
	"employment_type" "employment_type",
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"description" text,
	"status" "general_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payruns" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"pay_period_start" date NOT NULL,
	"pay_period_end" date NOT NULL,
	"payment_date" date NOT NULL,
	"pay_frequency" "pay_frequency" DEFAULT 'monthly' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"gross_total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"deduction_total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"employer_contribution_total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"net_total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"status" "payrun_status" DEFAULT 'draft' NOT NULL,
	"approved_by_id" integer,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payrun_period_end_after_start" CHECK ("payruns"."pay_period_end" >= "payruns"."pay_period_start")
);
--> statement-breakpoint
CREATE TABLE "payslip_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"payslip_id" integer NOT NULL,
	"salary_rule_id" integer,
	"name" varchar(150) NOT NULL,
	"type" "salary_rule_type" NOT NULL,
	"calculation_type" "calculation_type" DEFAULT 'fixed' NOT NULL,
	"amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"quantity" numeric(10, 2),
	"rate" numeric(14, 2),
	"is_taxable" boolean DEFAULT true NOT NULL,
	"auto_computed" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" serial PRIMARY KEY NOT NULL,
	"payrun_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"contract_id" integer,
	"salary_structure_id" integer,
	"gross_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"deduction_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"employer_contribution_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"paid_days" numeric(6, 2),
	"unpaid_days" numeric(6, 2),
	"overtime_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'bank_transfer' NOT NULL,
	"status" "payslip_status" DEFAULT 'draft' NOT NULL,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name"),
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "salary_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" "salary_rule_type" NOT NULL,
	"calculation_type" "calculation_type" DEFAULT 'fixed' NOT NULL,
	"amount" numeric(14, 2),
	"percentage" numeric(6, 2),
	"percentage_base" "calculation_base",
	"is_taxable" boolean DEFAULT true NOT NULL,
	"computation_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"pay_frequency" "pay_frequency" DEFAULT 'monthly' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"status" "general_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"time_off_type_id" integer NOT NULL,
	"allocation_id" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"is_half_day" boolean DEFAULT false NOT NULL,
	"days_requested" numeric(8, 2) NOT NULL,
	"reason" text,
	"status" time_off_request_status DEFAULT 'pending' NOT NULL,
	"approved_by_id" integer,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_time_off_request_end_after_start" CHECK ("time_off_requests"."end_date" >= "time_off_requests"."start_date"),
	CONSTRAINT "chk_time_off_request_days_positive" CHECK ("time_off_requests"."days_requested" > 0)
);
--> statement-breakpoint
CREATE TABLE "time_off_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"color" varchar(20),
	"is_paid" boolean DEFAULT true NOT NULL,
	"is_public_holiday" boolean DEFAULT false NOT NULL,
	"approval_required" boolean DEFAULT true NOT NULL,
	"carry_over_days" integer DEFAULT 0 NOT NULL,
	"max_consecutive_days" integer,
	"is_accrued" boolean DEFAULT false NOT NULL,
	"accrual_rate" numeric(6, 2),
	"min_notice_days" integer DEFAULT 0 NOT NULL,
	"status" "general_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(30),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "working_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"work_days" jsonb DEFAULT '[]'::jsonb,
	"start_time" time,
	"end_time" time,
	"break_start_time" time,
	"break_end_time" time,
	"weekly_hours" numeric(5, 2),
	"timezone" varchar(100) DEFAULT 'UTC',
	"is_flexible" boolean DEFAULT false NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"status" "general_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_time_off_type_id_time_off_types_id_fk" FOREIGN KEY ("time_off_type_id") REFERENCES "public"."time_off_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_working_schedule_id_working_schedules_id_fk" FOREIGN KEY ("working_schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_approved_by_id_employees_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_parent_company_id_companies_id_fk" FOREIGN KEY ("parent_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_working_schedule_id_working_schedules_id_fk" FOREIGN KEY ("working_schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_departments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_salary_rule_id_salary_rules_id_fk" FOREIGN KEY ("salary_rule_id") REFERENCES "public"."salary_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrun_id_payruns_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payruns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rules" ADD CONSTRAINT "salary_rules_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_time_off_type_id_time_off_types_id_fk" FOREIGN KEY ("time_off_type_id") REFERENCES "public"."time_off_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_approved_by_id_employees_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_types" ADD CONSTRAINT "time_off_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_schedules" ADD CONSTRAINT "working_schedules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_allocations_employee_type_year" ON "allocations" USING btree ("employee_id","time_off_type_id","period_year");--> statement-breakpoint
CREATE INDEX "idx_allocations_employee" ON "allocations" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendances_employee_date" ON "attendances" USING btree ("employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "idx_attendances_date" ON "attendances" USING btree ("attendance_date");--> statement-breakpoint
CREATE INDEX "idx_attendances_status" ON "attendances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contracts_employee" ON "contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_working_schedule" ON "contracts" USING btree ("working_schedule_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_salary_structure" ON "contracts" USING btree ("salary_structure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_company_code" ON "departments" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employees_company_code" ON "employees" USING btree ("company_id","employee_code");--> statement-breakpoint
CREATE INDEX "idx_employees_department" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_employees_job_position" ON "employees" USING btree ("job_position_id");--> statement-breakpoint
CREATE INDEX "idx_employees_manager" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_job_positions_company_code" ON "job_positions" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "idx_job_positions_department" ON "job_positions" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payruns_company_period" ON "payruns" USING btree ("company_id","pay_frequency","pay_period_start","pay_period_end");--> statement-breakpoint
CREATE INDEX "idx_payslip_lines_payslip" ON "payslip_lines" USING btree ("payslip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payslips_payrun_employee" ON "payslips" USING btree ("payrun_id","employee_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_employee" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_contract" ON "payslips" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_salary_structure" ON "payslips" USING btree ("salary_structure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_salary_rules_structure_code" ON "salary_rules" USING btree ("salary_structure_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_salary_structures_company_code" ON "salary_structures" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "idx_time_off_requests_employee_status" ON "time_off_requests" USING btree ("employee_id","status");--> statement-breakpoint
CREATE INDEX "idx_time_off_requests_type" ON "time_off_requests" USING btree ("time_off_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_time_off_types_company_code" ON "time_off_types" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_working_schedules_company_code" ON "working_schedules" USING btree ("company_id","code");