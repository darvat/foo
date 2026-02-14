/**
 * CardStack AI - Export / Publish Pipeline
 *
 * Generates a self-contained HTML bundle that includes the stack data
 * and a lightweight runtime for viewing/interacting with the stack.
 */

import type { Stack } from '../types/schema';

/**
 * Escape for HTML text content context.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate a standalone HTML file that runs the stack.
 */
export function exportAsHtml(stack: Stack): string {
  const stackJson = JSON.stringify(stack);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(stack.name)} - CardStack AI</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: ${escapeHtml(stack.settings.fontFamily || "'Inter', system-ui, sans-serif")}; font-size: 14px; line-height: 1.5; color: #0f172a; background: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; }
.nav { display: flex; gap: 4px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
.nav-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid transparent; background: transparent; cursor: pointer; font-size: 13px; font-weight: 500; color: #475569; font-family: inherit; transition: all 0.15s; }
.nav-btn:hover { background: #f1f5f9; }
.nav-btn.active { background: ${escapeHtml(stack.settings.primaryColor || '#6366f1')}; color: #fff; }
.container { flex: 1; display: flex; justify-content: center; padding: 24px; }
.card { width: 100%; max-width: 600px; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 32px; }
.card-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.field { margin-bottom: 16px; }
.field-label { font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 4px; }
.field-error { font-size: 12px; color: #ef4444; margin-top: 4px; }
input[type="text"], input[type="number"], textarea, select { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; }
input:focus, textarea:focus, select:focus { border-color: ${escapeHtml(stack.settings.primaryColor || '#6366f1')}; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
textarea { resize: vertical; min-height: 60px; }
.checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.checkbox input { width: 16px; height: 16px; accent-color: ${escapeHtml(stack.settings.primaryColor || '#6366f1')}; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; font-family: inherit; margin-right: 8px; margin-bottom: 4px; }
.btn-primary { background: ${escapeHtml(stack.settings.primaryColor || '#6366f1')}; color: #fff; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: #fff; color: #0f172a; border-color: #e2e8f0; }
.btn-secondary:hover { background: #f1f5f9; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }
.btn-link { background: transparent; color: ${escapeHtml(stack.settings.primaryColor || '#6366f1')}; border: none; }
.text-sm { font-size: 12px; }
.text-md { font-size: 14px; }
.text-lg { font-size: 18px; font-weight: 600; }
.text-xl { font-size: 22px; font-weight: 700; }
.msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; }
.msg-info { background: #dbeafe; color: #1e40af; }
.msg-success { background: #d1fae5; color: #065f46; }
.msg-warning { background: #fef3c7; color: #92400e; }
.msg-error { background: #fee2e2; color: #991b1b; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 12px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; }
td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
</style>
</head>
<body>
<script>
(function() {
  var stack = ${stackJson};
  var fields = {};
  var messages = [];
  var currentCardId = stack.cards[0] ? stack.cards[0].id : '';

  function getCard(id) { return stack.cards.find(function(c) { return c.id === id; }); }

  // ── Safe expression evaluator (no eval/new Function) ──────
  function safeEval(input, ctx) {
    if (!input || typeof input !== 'string') return undefined;
    try {
      var index = 0;
      var length = input.length;

      function isWS(ch) { return ch === ' ' || ch === '\\t' || ch === '\\n' || ch === '\\r'; }
      function isDigit(ch) { return ch >= '0' && ch <= '9'; }
      function isIdStart(ch) { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$'; }
      function isIdPart(ch) { return isIdStart(ch) || isDigit(ch); }
      function skipWS() { while (index < length && isWS(input[index])) index++; }

      function readNumber() {
        var start = index;
        while (index < length && isDigit(input[index])) index++;
        if (index < length && input[index] === '.') { index++; while (index < length && isDigit(input[index])) index++; }
        return { type: 'num', value: parseFloat(input.slice(start, index)) };
      }
      function readString() {
        var q = input[index++], s = '';
        while (index < length) {
          var ch = input[index++];
          if (ch === q) break;
          if (ch === '\\\\' && index < length) { var n = input[index++]; s += n === 'n' ? '\\n' : n === 't' ? '\\t' : n; }
          else s += ch;
        }
        return { type: 'str', value: s };
      }
      function readId() {
        var start = index;
        while (index < length && isIdPart(input[index])) index++;
        var v = input.slice(start, index);
        if (v === 'true') return { type: 'bool', value: true };
        if (v === 'false') return { type: 'bool', value: false };
        return { type: 'id', value: v };
      }
      function readOp() {
        var tw = input.slice(index, index + 2);
        if (tw === '&&' || tw === '||' || tw === '==' || tw === '!=' || tw === '<=' || tw === '>=') { index += 2; return { type: 'op', value: tw }; }
        var c = input[index++];
        return { type: 'op', value: c };
      }
      function nextTok() {
        skipWS();
        if (index >= length) return { type: 'eof' };
        var ch = input[index];
        if (isDigit(ch) || (ch === '.' && index + 1 < length && isDigit(input[index + 1]))) return readNumber();
        if (ch === '"' || ch === "'") return readString();
        if (isIdStart(ch)) return readId();
        if (ch === '(') { index++; return { type: 'lp' }; }
        if (ch === ')') { index++; return { type: 'rp' }; }
        if (ch === ',') { index++; return { type: 'cm' }; }
        if (ch === '.') { index++; return { type: 'dt' }; }
        return readOp();
      }

      var cur = nextTok();
      function eat(t) { var tk = cur; cur = nextTok(); return tk; }
      function expect(t) { if (cur.type !== t) throw new Error('Expected ' + t); return eat(t); }

      function resolve(name) {
        if (ctx.hasOwnProperty(name)) return ctx[name];
        return undefined;
      }

      function parsePrimary() {
        if (cur.type === 'num' || cur.type === 'str' || cur.type === 'bool') { var v = cur.value; eat(); return v; }
        if (cur.type === 'lp') { eat(); var e = parseExpr(); expect('rp'); return e; }
        if (cur.type === 'op' && cur.value === '-') { eat(); return -parsePrimary(); }
        if (cur.type === 'op' && cur.value === '!') { eat(); return !parsePrimary(); }
        if (cur.type === 'id') {
          var val = resolve(cur.value); eat();
          while (true) {
            if (cur.type === 'dt') {
              eat();
              if (cur.type !== 'id') throw new Error('Expected property');
              var prop = cur.value; eat();
              if (cur.type === 'lp') {
                eat();
                var args = [];
                if (cur.type !== 'rp') { args.push(parseExpr()); while (cur.type === 'cm') { eat(); args.push(parseExpr()); } }
                expect('rp');
                if (val != null && typeof val[prop] === 'function') val = val[prop].apply(val, args);
                else val = undefined;
              } else {
                val = (val != null) ? val[prop] : undefined;
              }
              continue;
            }
            if (cur.type === 'lp') {
              eat();
              var a2 = [];
              if (cur.type !== 'rp') { a2.push(parseExpr()); while (cur.type === 'cm') { eat(); a2.push(parseExpr()); } }
              expect('rp');
              if (typeof val === 'function') val = val.apply(undefined, a2);
              else val = undefined;
              continue;
            }
            break;
          }
          return val;
        }
        throw new Error('Unexpected token');
      }
      function parseMul() {
        var l = parsePrimary();
        while (cur.type === 'op' && (cur.value === '*' || cur.value === '/' || cur.value === '%')) {
          var op = cur.value; eat();
          var r = parsePrimary();
          if (op === '*') l = l * r;
          else if (op === '/') l = (r !== 0) ? l / r : undefined;
          else l = (r !== 0) ? l % r : undefined;
        }
        return l;
      }
      function parseAdd() {
        var l = parseMul();
        while (cur.type === 'op' && (cur.value === '+' || cur.value === '-')) {
          var op = cur.value; eat(); var r = parseMul();
          if (op === '+') { if (typeof l === 'string' || typeof r === 'string') l = String(l) + String(r); else l = Number(l) + Number(r); }
          else l = Number(l) - Number(r);
        }
        return l;
      }
      function parseCmp() {
        var l = parseAdd();
        while (cur.type === 'op' && (cur.value === '<' || cur.value === '<=' || cur.value === '>' || cur.value === '>=')) {
          var op = cur.value; eat(); var r = parseAdd();
          if (op === '<') l = l < r; else if (op === '<=') l = l <= r; else if (op === '>') l = l > r; else l = l >= r;
        }
        return l;
      }
      function parseEq() {
        var l = parseCmp();
        while (cur.type === 'op' && (cur.value === '==' || cur.value === '!=')) {
          var op = cur.value; eat(); var r = parseCmp();
          if (op === '==') l = l === r; else l = l !== r;
        }
        return l;
      }
      function parseAnd() {
        var l = parseEq();
        while (cur.type === 'op' && cur.value === '&&') { eat(); l = l && parseEq(); }
        return l;
      }
      function parseOr() {
        var l = parseAnd();
        while (cur.type === 'op' && cur.value === '||') { eat(); l = l || parseAnd(); }
        return l;
      }
      function parseExpr() { return parseOr(); }

      var result = parseExpr();
      return result;
    } catch (e) { return undefined; }
  }

  function evalExpr(expr) {
    return safeEval(expr, { fields: fields, Number: Number, String: String, Boolean: Boolean, Math: Math });
  }

  function evalCondition(expr) { return !!evalExpr(expr); }

  function executeEffect(effect) {
    switch (effect.type) {
      case 'navigate': navigateTo(effect.cardId); break;
      case 'setValue': fields[effect.target] = evalExpr(effect.expression); render(); break;
      case 'showMessage': messages.push({ type: 'info', text: effect.message }); render(); break;
      case 'runFormula': fields[effect.output] = evalExpr(effect.formula); render(); break;
      case 'validate': validateCard(); break;
    }
  }

  function validateCard() {
    var card = getCard(currentCardId);
    if (!card) return true;
    var hasError = false;
    card.components.forEach(function(c) {
      if (c.validation) {
        c.validation.forEach(function(v) {
          var val = fields[c.name];
          if (v.type === 'required' && (val === undefined || val === null || val === '')) {
            var el = document.getElementById('error-' + c.id);
            if (el) el.textContent = v.message;
            hasError = true;
          }
        });
      }
    });
    return !hasError;
  }

  function navigateTo(cardId) {
    currentCardId = cardId;
    messages.length = 0;
    render();
    var card = getCard(cardId);
    if (card) {
      card.actions.filter(function(a) { return a.trigger === 'onOpen'; }).forEach(function(a) {
        if (!a.condition || evalCondition(a.condition)) a.effects.forEach(executeEffect);
      });
      card.rules.filter(function(r) { return r.active; }).forEach(function(r) {
        if (evalCondition(r.condition)) r.thenEffects.forEach(executeEffect);
        else if (r.elseEffects) r.elseEffects.forEach(executeEffect);
      });
    }
  }

  function handleClick(componentId) {
    var card = getCard(currentCardId);
    if (!card) return;
    card.actions.filter(function(a) { return a.trigger === 'onClick' && (!a.componentId || a.componentId === componentId); }).forEach(function(a) {
      if (!a.condition || evalCondition(a.condition)) a.effects.forEach(executeEffect);
    });
  }

  function handleChange(name, value) {
    fields[name] = value;
    var card = getCard(currentCardId);
    if (!card) return;
    var comp = card.components.find(function(c) { return c.name === name; });
    if (comp) {
      card.actions.filter(function(a) { return a.trigger === 'onChange' && (!a.componentId || a.componentId === comp.id); }).forEach(function(a) {
        if (!a.condition || evalCondition(a.condition)) a.effects.forEach(executeEffect);
      });
      card.rules.filter(function(r) { return r.active; }).forEach(function(r) {
        if (evalCondition(r.condition)) r.thenEffects.forEach(executeEffect);
        else if (r.elseEffects) r.elseEffects.forEach(executeEffect);
      });
    }
  }

  // Escape for HTML text content
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Escape for use inside JavaScript string literals within HTML attributes
  function escJs(s) {
    return String(s).replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'").replace(/"/g,'\\\\"').replace(/</g,'\\\\u003c').replace(/>/g,'\\\\u003e');
  }

  function renderComponent(c) {
    var html = '';
    var id = escJs(c.id);
    var name = escJs(c.name);
    switch (c.type) {
      case 'text':
        var cls = 'text-' + (c.props.fontSize || 'md');
        html = '<div class="' + esc(cls) + '">' + esc(c.props.label || '') + '</div>';
        break;
      case 'input':
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '');
        if (c.props.multiline) {
          html += '<textarea placeholder="' + esc(c.props.placeholder || '') + '" rows="' + (c.props.rows || 3) + '" onchange="app.change(\\'' + name + '\\',this.value)">' + esc(String(fields[c.name] || c.props.defaultValue || '')) + '</textarea>';
        } else {
          html += '<input type="text" placeholder="' + esc(c.props.placeholder || '') + '" value="' + esc(String(fields[c.name] || c.props.defaultValue || '')) + '" onchange="app.change(\\'' + name + '\\',this.value)">';
        }
        html += '<div class="field-error" id="error-' + esc(c.id) + '"></div></div>';
        break;
      case 'number':
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '') +
          '<input type="number" placeholder="' + esc(c.props.placeholder || '') + '" value="' + esc(String(fields[c.name] || c.props.defaultValue || '')) + '" onchange="app.change(\\'' + name + '\\',Number(this.value))">' +
          '<div class="field-error" id="error-' + esc(c.id) + '"></div></div>';
        break;
      case 'dropdown':
        var opts = (c.props.options || []).map(function(o) { return '<option value="' + esc(o.value) + '"' + (fields[c.name] === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('');
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '') +
          '<select onchange="app.change(\\'' + name + '\\',this.value)"><option value="">Select...</option>' + opts + '</select>' +
          '<div class="field-error" id="error-' + esc(c.id) + '"></div></div>';
        break;
      case 'checkbox':
        html = '<div class="field"><label class="checkbox"><input type="checkbox"' + (fields[c.name] ? ' checked' : '') + ' onchange="app.change(\\'' + name + '\\',this.checked)"><span>' + esc(c.props.label || c.name) + '</span></label></div>';
        break;
      case 'button':
        var variant = esc(c.props.variant || 'primary');
        html = '<button class="btn btn-' + variant + '" onclick="app.click(\\'' + id + '\\')">' + esc(c.props.label || 'Button') + '</button>';
        break;
      case 'table':
        var cols = c.props.columns || [{ key: 'col1', label: 'Column 1' }];
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '') +
          '<table><thead><tr>' + cols.map(function(col) { return '<th>' + esc(col.label) + '</th>'; }).join('') + '</tr></thead><tbody></tbody></table></div>';
        break;
      default:
        html = '<div>' + esc(c.type) + '</div>';
    }
    return html;
  }

  function render() {
    var card = getCard(currentCardId);
    if (!card) return;

    var navHtml = '';
    if (stack.settings.showNavigation && stack.cards.length > 1) {
      navHtml = '<div class="nav">' + stack.cards.map(function(c) {
        return '<button class="nav-btn' + (c.id === currentCardId ? ' active' : '') + '" onclick="app.nav(\\'' + escJs(c.id) + '\\')">' + esc(c.title) + '</button>';
      }).join('') + '</div>';
    }

    var msgsHtml = messages.map(function(m) { return '<div class="msg msg-' + esc(m.type) + '">' + esc(m.text) + '</div>'; }).join('');

    var compsHtml = card.components.slice().sort(function(a, b) { return a.order - b.order; }).map(renderComponent).join('');

    document.body.innerHTML = navHtml +
      '<div class="container"><div class="card"><div class="card-title">' + esc(card.title) + '</div>' + msgsHtml + compsHtml + '</div></div>';
  }

  window.app = { nav: navigateTo, click: handleClick, change: handleChange };
  render();
  navigateTo(currentCardId);
})();
</script>
</body>
</html>`;
}

/**
 * Export stack as a JSON file.
 */
export function exportAsJson(stack: Stack): string {
  return JSON.stringify(stack, null, 2);
}

/**
 * Trigger a browser download of content.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
