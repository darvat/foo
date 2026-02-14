/**
 * Sandboxed expression evaluator for CardStack AI.
 *
 * Evaluates simple expressions against a context of field values.
 * No arbitrary code execution - only safe math, comparison, and string operations.
 */

export type ExpressionContext = Record<string, unknown>;

interface Token {
  type: 'number' | 'string' | 'boolean' | 'identifier' | 'operator' | 'paren' | 'dot' | 'comma';
  value: string;
}

const OPERATORS = new Set(['+', '-', '*', '/', '%', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!']);
const SAFE_FUNCTIONS = new Set(['Math.abs', 'Math.round', 'Math.floor', 'Math.ceil', 'Math.min', 'Math.max', 'Math.pow', 'String', 'Number', 'Boolean', 'len', 'upper', 'lower', 'trim', 'contains', 'startsWith', 'endsWith', 'concat', 'toFixed', 'isEmpty', 'isNotEmpty', 'sum', 'avg', 'count', 'today', 'now', 'formatDate', 'if']);

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    if (/\s/.test(expr[i])) {
      i++;
      continue;
    }

    // String literals
    if (expr[i] === '"' || expr[i] === "'") {
      const quote = expr[i];
      let str = '';
      i++;
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\') {
          i++;
          str += expr[i] || '';
        } else {
          str += expr[i];
        }
        i++;
      }
      i++; // closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Numbers
    if (/\d/.test(expr[i]) || (expr[i] === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Multi-char operators
    if (i + 1 < expr.length) {
      const two = expr[i] + expr[i + 1];
      if (OPERATORS.has(two)) {
        tokens.push({ type: 'operator', value: two });
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if (OPERATORS.has(expr[i])) {
      tokens.push({ type: 'operator', value: expr[i] });
      i++;
      continue;
    }

    // Parentheses and brackets
    if (expr[i] === '(' || expr[i] === ')') {
      tokens.push({ type: 'paren', value: expr[i] });
      i++;
      continue;
    }

    // Dot
    if (expr[i] === '.') {
      tokens.push({ type: 'dot', value: '.' });
      i++;
      continue;
    }

    // Comma
    if (expr[i] === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(expr[i])) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) {
        id += expr[i];
        i++;
      }
      if (id === 'true' || id === 'false') {
        tokens.push({ type: 'boolean', value: id });
      } else {
        tokens.push({ type: 'identifier', value: id });
      }
      continue;
    }

    throw new ExpressionError(`Unexpected character: ${expr[i]}`);
  }

  return tokens;
}

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpressionError';
  }
}

class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const tok = this.tokens[this.pos];
    if (!tok) throw new ExpressionError('Unexpected end of expression');
    this.pos++;
    return tok;
  }

  private expect(type: string, value?: string): Token {
    const tok = this.consume();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new ExpressionError(`Expected ${type}${value ? ` '${value}'` : ''}, got ${tok.type} '${tok.value}'`);
    }
    return tok;
  }

  parse(): (ctx: ExpressionContext) => unknown {
    const expr = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new ExpressionError(`Unexpected token: ${this.tokens[this.pos].value}`);
    }
    return expr;
  }

  private parseOr(): (ctx: ExpressionContext) => unknown {
    let left = this.parseAnd();
    while (this.peek()?.value === '||') {
      this.consume();
      const right = this.parseAnd();
      const prevLeft = left;
      left = (ctx) => Boolean(prevLeft(ctx)) || Boolean(right(ctx));
    }
    return left;
  }

  private parseAnd(): (ctx: ExpressionContext) => unknown {
    let left = this.parseComparison();
    while (this.peek()?.value === '&&') {
      this.consume();
      const right = this.parseComparison();
      const prevLeft = left;
      left = (ctx) => Boolean(prevLeft(ctx)) && Boolean(right(ctx));
    }
    return left;
  }

  private parseComparison(): (ctx: ExpressionContext) => unknown {
    let left = this.parseAddSub();
    const compOps = new Set(['==', '!=', '>', '<', '>=', '<=']);
    while (this.peek() && compOps.has(this.peek()!.value)) {
      const op = this.consume().value;
      const right = this.parseAddSub();
      const prevLeft = left;
      left = (ctx) => {
        const l = prevLeft(ctx);
        const r = right(ctx);
        switch (op) {
          case '==': return l === r;
          case '!=': return l !== r;
          case '>': return Number(l) > Number(r);
          case '<': return Number(l) < Number(r);
          case '>=': return Number(l) >= Number(r);
          case '<=': return Number(l) <= Number(r);
          default: return false;
        }
      };
    }
    return left;
  }

  private parseAddSub(): (ctx: ExpressionContext) => unknown {
    let left = this.parseMulDiv();
    while (this.peek()?.value === '+' || this.peek()?.value === '-') {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      const prevLeft = left;
      left = (ctx) => {
        const l = prevLeft(ctx);
        const r = right(ctx);
        if (op === '+') {
          if (typeof l === 'string' || typeof r === 'string') return String(l) + String(r);
          return Number(l) + Number(r);
        }
        return Number(l) - Number(r);
      };
    }
    return left;
  }

  private parseMulDiv(): (ctx: ExpressionContext) => unknown {
    let left = this.parseUnary();
    while (this.peek()?.value === '*' || this.peek()?.value === '/' || this.peek()?.value === '%') {
      const op = this.consume().value;
      const right = this.parseUnary();
      const prevLeft = left;
      left = (ctx) => {
        const l = Number(prevLeft(ctx));
        const r = Number(right(ctx));
        switch (op) {
          case '*': return l * r;
          case '/': return r !== 0 ? l / r : undefined;
          case '%': return r !== 0 ? l % r : undefined;
          default: return 0;
        }
      };
    }
    return left;
  }

  private parseUnary(): (ctx: ExpressionContext) => unknown {
    if (this.peek()?.value === '!') {
      this.consume();
      const operand = this.parseUnary();
      return (ctx) => !operand(ctx);
    }
    if (this.peek()?.value === '-') {
      this.consume();
      const operand = this.parseUnary();
      return (ctx) => -Number(operand(ctx));
    }
    return this.parseCallOrAccess();
  }

  private parseCallOrAccess(): (ctx: ExpressionContext) => unknown {
    let expr = this.parsePrimary();

    while (this.peek()?.type === 'dot' || this.peek()?.value === '(') {
      if (this.peek()?.type === 'dot') {
        this.consume();
        const prop = this.expect('identifier');
        const prevExpr = expr;
        const propName = prop.value;

        // Check if it's a function call
        if (this.peek()?.value === '(') {
          this.consume();
          const args: ((ctx: ExpressionContext) => unknown)[] = [];
          if (this.peek()?.value !== ')') {
            args.push(this.parseOr());
            while (this.peek()?.value === ',') {
              this.consume();
              args.push(this.parseOr());
            }
          }
          this.expect('paren', ')');

          const capturedArgs = [...args];
          expr = (ctx) => {
            const obj = prevExpr(ctx);
            const evalArgs = capturedArgs.map((a) => a(ctx));
            return callMethod(obj, propName, evalArgs);
          };
        } else {
          expr = (ctx) => {
            const obj = prevExpr(ctx);
            if (obj === null || obj === undefined) return undefined;
            return (obj as Record<string, unknown>)[propName];
          };
        }
      }
    }

    return expr;
  }

  private parsePrimary(): (ctx: ExpressionContext) => unknown {
    const tok = this.peek();
    if (!tok) throw new ExpressionError('Unexpected end of expression');

    // Number
    if (tok.type === 'number') {
      this.consume();
      const val = Number(tok.value);
      return () => val;
    }

    // String
    if (tok.type === 'string') {
      this.consume();
      const val = tok.value;
      return () => val;
    }

    // Boolean
    if (tok.type === 'boolean') {
      this.consume();
      const val = tok.value === 'true';
      return () => val;
    }

    // Parenthesized expression
    if (tok.value === '(') {
      this.consume();
      const expr = this.parseOr();
      this.expect('paren', ')');
      return expr;
    }

    // Identifier (variable, function call, etc.)
    if (tok.type === 'identifier') {
      this.consume();
      const name = tok.value;

      // Built-in function call
      if (this.peek()?.value === '(') {
        this.consume();
        const args: ((ctx: ExpressionContext) => unknown)[] = [];
        if (this.peek()?.value !== ')') {
          args.push(this.parseOr());
          while (this.peek()?.value === ',') {
            this.consume();
            args.push(this.parseOr());
          }
        }
        this.expect('paren', ')');

        const capturedArgs = [...args];
        return (ctx) => {
          const evalArgs = capturedArgs.map((a) => a(ctx));
          return callFunction(name, evalArgs, ctx);
        };
      }

      // Variable reference
      return (ctx) => resolveIdentifier(name, ctx);
    }

    throw new ExpressionError(`Unexpected token: ${tok.value}`);
  }
}

function resolveIdentifier(name: string, ctx: ExpressionContext): unknown {
  if (name in ctx) return ctx[name];

  // Support dotted names like "fields" as top-level namespace
  if (name === 'fields' && 'fields' in ctx) return ctx.fields;
  if (name === 'data' && 'data' in ctx) return ctx.data;
  if (name === 'vars' && 'variables' in ctx) return ctx.variables;

  return undefined;
}

function callFunction(name: string, args: unknown[], ctx: ExpressionContext): unknown {
  switch (name) {
    // Conditionals
    case 'if':
      return args[0] ? args[1] : args[2];

    // String functions
    case 'len':
      return typeof args[0] === 'string' ? args[0].length : Array.isArray(args[0]) ? args[0].length : 0;
    case 'upper':
      return String(args[0]).toUpperCase();
    case 'lower':
      return String(args[0]).toLowerCase();
    case 'trim':
      return String(args[0]).trim();
    case 'contains':
      return String(args[0]).includes(String(args[1]));
    case 'startsWith':
      return String(args[0]).startsWith(String(args[1]));
    case 'endsWith':
      return String(args[0]).endsWith(String(args[1]));
    case 'concat':
      return args.map(String).join('');

    // Number functions
    case 'toFixed':
      return Number(args[0]).toFixed(Number(args[1]) || 0);
    case 'Number':
      return Number(args[0]);
    case 'String':
      return String(args[0]);
    case 'Boolean':
      return Boolean(args[0]);

    // Checks
    case 'isEmpty':
      return args[0] === undefined || args[0] === null || args[0] === '';
    case 'isNotEmpty':
      return args[0] !== undefined && args[0] !== null && args[0] !== '';

    // Aggregate functions
    case 'sum':
      if (Array.isArray(args[0])) return (args[0] as number[]).reduce((a, b) => a + Number(b), 0);
      return args.reduce((a: number, b) => a + Number(b), 0 as number);
    case 'avg': {
      if (Array.isArray(args[0])) {
        const arr = args[0] as number[];
        return arr.length ? arr.reduce((a, b) => a + Number(b), 0) / arr.length : 0;
      }
      return args.length ? (args.reduce((a: number, b) => a + Number(b), 0 as number) as number) / args.length : 0;
    }
    case 'count':
      return Array.isArray(args[0]) ? args[0].length : 0;

    // Math namespace
    case 'abs':
      return Math.abs(Number(args[0]));
    case 'round':
      return Math.round(Number(args[0]));
    case 'floor':
      return Math.floor(Number(args[0]));
    case 'ceil':
      return Math.ceil(Number(args[0]));
    case 'min':
      return Math.min(...args.map(Number));
    case 'max':
      return Math.max(...args.map(Number));
    case 'pow':
      return Math.pow(Number(args[0]), Number(args[1]));

    // Date functions
    case 'today':
      return new Date().toISOString().split('T')[0];
    case 'now':
      return new Date().toISOString();
    case 'formatDate': {
      const date = new Date(String(args[0]));
      return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
    }

    default:
      // Check context for user-defined functions
      if (name in ctx && typeof ctx[name] === 'function') {
        return (ctx[name] as (...a: unknown[]) => unknown)(...args);
      }
      throw new ExpressionError(`Unknown function: ${name}`);
  }
}

function callMethod(obj: unknown, method: string, args: unknown[]): unknown {
  if (obj === null || obj === undefined) return undefined;

  // String methods
  if (typeof obj === 'string') {
    switch (method) {
      case 'length': return obj.length;
      case 'toUpperCase': return obj.toUpperCase();
      case 'toLowerCase': return obj.toLowerCase();
      case 'trim': return obj.trim();
      case 'includes': return obj.includes(String(args[0]));
      case 'startsWith': return obj.startsWith(String(args[0]));
      case 'endsWith': return obj.endsWith(String(args[0]));
      case 'replace': return obj.replace(String(args[0]), String(args[1]));
      case 'split': return obj.split(String(args[0]));
      case 'substring': return obj.substring(Number(args[0]), args[1] !== undefined ? Number(args[1]) : undefined);
    }
  }

  // Array methods
  if (Array.isArray(obj)) {
    switch (method) {
      case 'length': return obj.length;
      case 'includes': return obj.includes(args[0]);
      case 'join': return obj.join(String(args[0] ?? ','));
    }
  }

  // Number methods
  if (typeof obj === 'number') {
    switch (method) {
      case 'toFixed': return obj.toFixed(Number(args[0]) || 0);
      case 'toString': return obj.toString();
    }
  }

  // Generic object property access
  if (typeof obj === 'object') {
    return (obj as Record<string, unknown>)[method];
  }

  throw new ExpressionError(`Cannot call .${method} on ${typeof obj}`);
}

/**
 * Compile an expression string into a reusable function.
 */
export function compileExpression(expr: string): (ctx: ExpressionContext) => unknown {
  if (!expr || !expr.trim()) return () => undefined;
  const tokens = tokenize(expr.trim());
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Evaluate an expression string with a given context.
 */
export function evaluateExpression(expr: string, ctx: ExpressionContext): unknown {
  try {
    const fn = compileExpression(expr);
    return fn(ctx);
  } catch (e) {
    if (e instanceof ExpressionError) {
      return undefined;
    }
    throw e;
  }
}

/**
 * Evaluate an expression and coerce to boolean.
 */
export function evaluateCondition(expr: string, ctx: ExpressionContext): boolean {
  return Boolean(evaluateExpression(expr, ctx));
}
