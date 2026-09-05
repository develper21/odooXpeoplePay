import type { ComputationType, SalaryRule, SalaryRuleCategory, SalaryStructure } from "@/types/domain";

export interface SalaryCalculationContext {
  baseSalary?: number;
  employeeId?: string;
  contractId?: string;
  workedDays?: number;
  totalDays?: number;
  [key: string]: any;
}

export interface CalculatedRuleResult {
  ruleId: string;
  code: string;
  name: string;
  category: SalaryRuleCategory;
  sequence: number;
  computationType: ComputationType;
  expressionDisplay: string;
  amount: number;
  error?: string;
}

export interface SalaryCalculationTotals {
  basic: number;
  allowances: number;
  gross: number;
  deductions: number;
  net: number;
}

export interface SalaryCalculationResult {
  rules: CalculatedRuleResult[];
  totals: SalaryCalculationTotals;
  errors: string[];
  warnings: string[];
}

/**
 * Sorts salary rules deterministically by sequence ascending.
 */
export function sortRulesBySequence(rules: SalaryRule[]): SalaryRule[] {
  return [...rules].sort((a, b) => {
    if (a.sequence !== b.sequence) {
      return a.sequence - b.sequence;
    }
    return a.code.localeCompare(b.code);
  });
}

// ---------------------------------------------------------------------------
// Controlled Safe Expression Evaluator (NO eval / NO new Function)
// ---------------------------------------------------------------------------

type TokenType = "NUMBER" | "IDENTIFIER" | "PLUS" | "MINUS" | "STAR" | "SLASH" | "LPAREN" | "RPAREN";

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Tokenizes a mathematical formula containing numbers, operators, and rule codes.
 * Throws an error immediately on any illegal character.
 */
export function tokenizeFormula(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const ch = formula[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "+") {
      tokens.push({ type: "PLUS", value: "+", position: i });
      i++;
    } else if (ch === "-") {
      tokens.push({ type: "MINUS", value: "-", position: i });
      i++;
    } else if (ch === "*") {
      tokens.push({ type: "STAR", value: "*", position: i });
      i++;
    } else if (ch === "/") {
      tokens.push({ type: "SLASH", value: "/", position: i });
      i++;
    } else if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(", position: i });
      i++;
    } else if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")", position: i });
      i++;
    } else if (/[0-9]/.test(ch) || (ch === "." && i + 1 < formula.length && /[0-9]/.test(formula[i + 1]))) {
      let numStr = "";
      const start = i;
      while (i < formula.length && /[0-9.]/.test(formula[i])) {
        numStr += formula[i];
        i++;
      }
      if (isNaN(Number(numStr))) {
        throw new Error(`Invalid number format "${numStr}" at position ${start}`);
      }
      tokens.push({ type: "NUMBER", value: numStr, position: start });
    } else if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      const start = i;
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        ident += formula[i];
        i++;
      }
      tokens.push({ type: "IDENTIFIER", value: ident.toUpperCase(), position: start });
    } else {
      throw new Error(`Unauthorized or invalid character "${ch}" at position ${i}. Formulas only support arithmetic operators (+, -, *, /), parentheses, numbers, and rule codes.`);
    }
  }

  return tokens;
}

/**
 * Extracts all rule code identifiers referenced in a formula.
 */
export function extractFormulaIdentifiers(formula: string): string[] {
  if (!formula || typeof formula !== "string") return [];
  try {
    const tokens = tokenizeFormula(formula);
    const idents = new Set<string>();
    tokens.forEach((t) => {
      if (t.type === "IDENTIFIER") {
        idents.add(t.value);
      }
    });
    return Array.from(idents);
  } catch {
    return [];
  }
}

/**
 * Validates a formula syntax without evaluating it.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateFormulaSyntax(formula: string): { valid: boolean; error?: string } {
  if (!formula || formula.trim().length === 0) {
    return { valid: false, error: "Formula cannot be empty." };
  }

  let tokens: Token[];
  try {
    tokens = tokenizeFormula(formula);
  } catch (err: any) {
    return { valid: false, error: err.message };
  }

  if (tokens.length === 0) {
    return { valid: false, error: "Formula contains no executable tokens." };
  }

  // Safe parse check using dummy scope
  try {
    const dummyScope: Record<string, number> = {};
    tokens.forEach((t) => {
      if (t.type === "IDENTIFIER") {
        dummyScope[t.value] = 1;
      }
    });
    evaluateTokens(tokens, dummyScope);
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/**
 * Safe Recursive Descent Parser to evaluate tokens using a scope map.
 */
function evaluateTokens(tokens: Token[], scope: Record<string, number>): number {
  let index = 0;

  function peek(): Token | undefined {
    return tokens[index];
  }

  function consume(expected?: TokenType): Token {
    const t = tokens[index];
    if (!t) throw new Error("Unexpected end of formula");
    if (expected && t.type !== expected) {
      throw new Error(`Expected "${expected}" but found "${t.value}" at position ${t.position}`);
    }
    index++;
    return t;
  }

  // expr = term (("+" | "-") term)*
  function parseExpression(): number {
    let result = parseTerm();

    while (peek()?.type === "PLUS" || peek()?.type === "MINUS") {
      const op = consume();
      const nextTerm = parseTerm();
      if (op.type === "PLUS") {
        result += nextTerm;
      } else {
        result -= nextTerm;
      }
    }

    return result;
  }

  // term = factor (("*" | "/") factor)*
  function parseTerm(): number {
    let result = parseFactor();

    while (peek()?.type === "STAR" || peek()?.type === "SLASH") {
      const op = consume();
      const nextFactor = parseFactor();
      if (op.type === "STAR") {
        result *= nextFactor;
      } else {
        if (nextFactor === 0) {
          throw new Error("Division by zero in formula");
        }
        result /= nextFactor;
      }
    }

    return result;
  }

  // factor = ("+" | "-")? primary
  function parseFactor(): number {
    if (peek()?.type === "PLUS") {
      consume();
      return parsePrimary();
    }
    if (peek()?.type === "MINUS") {
      consume();
      return -parsePrimary();
    }
    return parsePrimary();
  }

  // primary = NUMBER | IDENTIFIER | "(" expr ")"
  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new Error("Unexpected end of formula where a value was expected");

    if (t.type === "NUMBER") {
      consume();
      return Number(t.value);
    }

    if (t.type === "IDENTIFIER") {
      consume();
      const upper = t.value.toUpperCase();
      if (peek()?.type === "LPAREN") {
        throw new Error(`Function calls like "${upper}(...)" are prohibited in salary formulas. Only arithmetic operators and rule code references are supported.`);
      }
      if (!(upper in scope)) {
        throw new Error(`Undefined rule reference "${upper}". Rule has not been calculated yet or does not exist.`);
      }
      return scope[upper];
    }

    if (t.type === "LPAREN") {
      consume("LPAREN");
      const sub = parseExpression();
      consume("RPAREN");
      return sub;
    }

    throw new Error(`Unexpected token "${t.value}" at position ${t.position}`);
  }

  const res = parseExpression();
  if (index < tokens.length) {
    throw new Error(`Unexpected trailing token "${tokens[index].value}" at position ${tokens[index].position}`);
  }
  return res;
}

/**
 * Evaluates a safe formula against a dictionary of rule values.
 */
export function evaluateSafeFormula(formula: string, scope: Record<string, number>): number {
  const tokens = tokenizeFormula(formula);
  return evaluateTokens(tokens, scope);
}

// ---------------------------------------------------------------------------
// Dependency Graph & Cycle Detection
// ---------------------------------------------------------------------------

export interface RuleValidationIssue {
  ruleCode: string;
  message: string;
  type: "error" | "warning";
}

/**
 * Validates dependencies between rules in a structure or set:
 * - Checks that referenced codes exist.
 * - Checks that referenced codes appear before the referencing rule in sequence.
 * - Detects circular dependencies.
 */
export function validateRuleDependencies(rules: SalaryRule[]): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  const sorted = sortRulesBySequence(rules);
  const codeToRule = new Map<string, SalaryRule>();
  const codeIndex = new Map<string, number>();

  sorted.forEach((rule, idx) => {
    codeToRule.set(rule.code.toUpperCase(), rule);
    codeIndex.set(rule.code.toUpperCase(), idx);
  });

  sorted.forEach((rule, idx) => {
    const upperCode = rule.code.toUpperCase();
    const dependencies: string[] = [];

    if (rule.computationType === "PERCENTAGE") {
      const bases = rule.basedOn && rule.basedOn.length > 0 ? rule.basedOn : ["BASIC"];
      dependencies.push(...bases.map((b) => b.toUpperCase()));
    } else if (rule.computationType === "FORMULA" && rule.formula) {
      dependencies.push(...extractFormulaIdentifiers(rule.formula));
    }

    for (const dep of dependencies) {
      if (!codeToRule.has(dep)) {
        issues.push({
          ruleCode: rule.code,
          message: `Rule "${rule.code}" references code "${dep}" which is not defined in this set.`,
          type: "error",
        });
        continue;
      }

      const depIdx = codeIndex.get(dep)!;
      if (depIdx >= idx) {
        issues.push({
          ruleCode: rule.code,
          message: `Sequence violation: Rule "${rule.code}" (Seq ${rule.sequence}) depends on "${dep}" (Seq ${codeToRule.get(dep)!.sequence}). Dependent rules must have a higher sequence number.`,
          type: "error",
        });
      }
    }
  });

  // Cycle detection
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(currCode: string): boolean {
    visited.add(currCode);
    recStack.add(currCode);

    const rule = codeToRule.get(currCode);
    if (rule) {
      let deps: string[] = [];
      if (rule.computationType === "PERCENTAGE") {
        deps = (rule.basedOn || ["BASIC"]).map((s) => s.toUpperCase());
      } else if (rule.computationType === "FORMULA" && rule.formula) {
        deps = extractFormulaIdentifiers(rule.formula);
      }

      for (const d of deps) {
        if (!visited.has(d)) {
          if (dfs(d)) return true;
        } else if (recStack.has(d)) {
          issues.push({
            ruleCode: currCode,
            message: `Circular dependency detected involving rule "${currCode}" and "${d}".`,
            type: "error",
          });
          return true;
        }
      }
    }

    recStack.delete(currCode);
    return false;
  }

  for (const code of Array.from(codeToRule.keys())) {
    if (!visited.has(code)) {
      dfs(code);
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Salary Calculation Core Engine
// ---------------------------------------------------------------------------

/**
 * Calculates all salary rules in deterministic sequence order.
 * Safe from arbitrary JS execution, returns structured rule breakdowns and category totals.
 */
export function calculateSalary(
  rules: SalaryRule[],
  context: SalaryCalculationContext = {}
): SalaryCalculationResult {
  const sorted = sortRulesBySequence(rules);
  const calculatedResults: CalculatedRuleResult[] = [];
  const scope: Record<string, number> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // Seed scope with context variables if any
  if (context.baseSalary !== undefined) {
    scope["BASE_SALARY"] = context.baseSalary;
  }

  for (const rule of sorted) {
    const code = rule.code.toUpperCase();
    let amount = 0;
    let expressionDisplay = "";
    let ruleError: string | undefined;

    try {
      if (rule.computationType === "FIXED") {
        // If context provides an explicit base salary and this is the BASIC rule, support override
        if (code === "BASIC" && context.baseSalary !== undefined && context.baseSalary > 0) {
          amount = context.baseSalary;
          expressionDisplay = `Base (override): ₹${amount.toLocaleString()}`;
        } else {
          amount = rule.amount ?? 0;
          expressionDisplay = `Fixed: ₹${amount.toLocaleString()}`;
        }
      } else if (rule.computationType === "PERCENTAGE") {
        const bases = rule.basedOn && rule.basedOn.length > 0 ? rule.basedOn : ["BASIC"];
        const percentage = rule.percentage ?? 0;

        let baseTotal = 0;
        const missingBases: string[] = [];
        for (const b of bases) {
          const upperB = b.toUpperCase();
          if (upperB in scope) {
            baseTotal += scope[upperB];
          } else {
            missingBases.push(upperB);
          }
        }

        if (missingBases.length > 0) {
          throw new Error(`Referenced basis rule(s) [${missingBases.join(", ")}] not yet calculated or missing.`);
        }

        amount = Math.round((baseTotal * percentage) / 100);
        expressionDisplay = `${percentage}% of ${bases.join(" + ")}`;
      } else if (rule.computationType === "FORMULA") {
        const formula = rule.formula ?? "";
        if (!formula.trim()) {
          throw new Error("Formula is empty.");
        }
        amount = Math.round(evaluateSafeFormula(formula, scope));
        expressionDisplay = formula;
      } else {
        // Fallback for legacy kinds
        amount = rule.amount ?? 0;
        expressionDisplay = `Standard: ₹${amount.toLocaleString()}`;
      }
    } catch (err: any) {
      ruleError = err.message;
      errors.push(`Rule ${rule.code}: ${err.message}`);
      amount = 0;
    }

    scope[code] = amount;

    // Determine normalized category
    let category: SalaryRuleCategory = "ALLOWANCE";
    if (rule.category === "BASIC") category = "BASIC";
    else if (rule.category === "ALLOWANCE" || rule.category === "EARNING") category = "ALLOWANCE";
    else if (rule.category === "GROSS") category = "GROSS";
    else if (rule.category === "DEDUCTION") category = "DEDUCTION";
    else if (rule.category === "NET") category = "NET";

    calculatedResults.push({
      ruleId: rule.id,
      code: rule.code,
      name: rule.name,
      category,
      sequence: rule.sequence,
      computationType: rule.computationType,
      expressionDisplay,
      amount,
      error: ruleError,
    });
  }

  // Calculate Totals based on canonical categories
  let basicTotal = 0;
  let allowancesTotal = 0;
  let deductionsTotal = 0;
  let explicitGross: number | null = null;
  let explicitNet: number | null = null;

  for (const item of calculatedResults) {
    if (item.category === "BASIC") {
      basicTotal += item.amount;
    } else if (item.category === "ALLOWANCE") {
      allowancesTotal += item.amount;
    } else if (item.category === "GROSS") {
      explicitGross = item.amount;
    } else if (item.category === "DEDUCTION") {
      deductionsTotal += item.amount;
    } else if (item.category === "NET") {
      explicitNet = item.amount;
    }
  }

  const grossTotal = explicitGross !== null ? explicitGross : basicTotal + allowancesTotal;
  const netTotal = explicitNet !== null ? explicitNet : grossTotal - deductionsTotal;

  return {
    rules: calculatedResults,
    totals: {
      basic: basicTotal,
      allowances: allowancesTotal,
      gross: grossTotal,
      deductions: deductionsTotal,
      net: netTotal,
    },
    errors,
    warnings,
  };
}
