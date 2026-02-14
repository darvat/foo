/**
 * CardStack AI - Export / Publish Pipeline
 *
 * Generates a self-contained HTML bundle that includes the stack data
 * and a lightweight runtime for viewing/interacting with the stack.
 */

import type { Stack } from '../types/schema';

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
body { font-family: ${stack.settings.fontFamily || "'Inter', system-ui, sans-serif"}; font-size: 14px; line-height: 1.5; color: #0f172a; background: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; }
.nav { display: flex; gap: 4px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
.nav-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid transparent; background: transparent; cursor: pointer; font-size: 13px; font-weight: 500; color: #475569; font-family: inherit; transition: all 0.15s; }
.nav-btn:hover { background: #f1f5f9; }
.nav-btn.active { background: ${stack.settings.primaryColor || '#6366f1'}; color: #fff; }
.container { flex: 1; display: flex; justify-content: center; padding: 24px; }
.card { width: 100%; max-width: 600px; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 32px; }
.card-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.field { margin-bottom: 16px; }
.field-label { font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 4px; }
.field-error { font-size: 12px; color: #ef4444; margin-top: 4px; }
input[type="text"], input[type="number"], textarea, select { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; }
input:focus, textarea:focus, select:focus { border-color: ${stack.settings.primaryColor || '#6366f1'}; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
textarea { resize: vertical; min-height: 60px; }
.checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.checkbox input { width: 16px; height: 16px; accent-color: ${stack.settings.primaryColor || '#6366f1'}; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; font-family: inherit; margin-right: 8px; margin-bottom: 4px; }
.btn-primary { background: ${stack.settings.primaryColor || '#6366f1'}; color: #fff; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: #fff; color: #0f172a; border-color: #e2e8f0; }
.btn-secondary:hover { background: #f1f5f9; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }
.btn-link { background: transparent; color: ${stack.settings.primaryColor || '#6366f1'}; border: none; }
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
  const stack = ${stackJson};
  const fields = {};
  const messages = [];
  let currentCardId = stack.cards[0]?.id || '';

  function getCard(id) { return stack.cards.find(c => c.id === id); }

  function evalExpr(expr) {
    if (!expr) return undefined;
    try {
      const ctx = { fields, Math };
      const fn = new Function(...Object.keys(ctx), 'return ' + expr.replace(/fields\\./g, 'fields.'));
      return fn(...Object.values(ctx));
    } catch { return undefined; }
  }

  function evalCondition(expr) { return Boolean(evalExpr(expr)); }

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
    const card = getCard(currentCardId);
    if (!card) return;
    let hasError = false;
    card.components.forEach(c => {
      if (c.validation) {
        c.validation.forEach(v => {
          const val = fields[c.name];
          if (v.type === 'required' && (val === undefined || val === null || val === '')) {
            const el = document.getElementById('error-' + c.id);
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
    const card = getCard(cardId);
    if (card) {
      card.actions.filter(a => a.trigger === 'onOpen').forEach(a => {
        if (!a.condition || evalCondition(a.condition)) a.effects.forEach(executeEffect);
      });
      card.rules.filter(r => r.active).forEach(r => {
        if (evalCondition(r.condition)) r.thenEffects.forEach(executeEffect);
        else if (r.elseEffects) r.elseEffects.forEach(executeEffect);
      });
    }
  }

  function handleClick(componentId) {
    const card = getCard(currentCardId);
    if (!card) return;
    card.actions.filter(a => a.trigger === 'onClick' && (!a.componentId || a.componentId === componentId)).forEach(a => {
      if (!a.condition || evalCondition(a.condition)) a.effects.forEach(executeEffect);
    });
  }

  function handleChange(name, value) {
    fields[name] = value;
    const card = getCard(currentCardId);
    if (!card) return;
    const comp = card.components.find(c => c.name === name);
    if (comp) {
      card.actions.filter(a => a.trigger === 'onChange' && (!a.componentId || a.componentId === comp.id)).forEach(a => {
        if (!a.condition || evalCondition(a.condition)) a.effects.forEach(executeEffect);
      });
      card.rules.filter(r => r.active).forEach(r => {
        if (evalCondition(r.condition)) r.thenEffects.forEach(executeEffect);
        else if (r.elseEffects) r.elseEffects.forEach(executeEffect);
      });
    }
  }

  function renderComponent(c) {
    let html = '';
    switch (c.type) {
      case 'text': {
        const cls = 'text-' + (c.props.fontSize || 'md');
        html = '<div class="' + cls + '">' + esc(c.props.label || '') + '</div>';
        break;
      }
      case 'input':
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '');
        if (c.props.multiline) {
          html += '<textarea placeholder="' + esc(c.props.placeholder || '') + '" rows="' + (c.props.rows || 3) + '" onchange="app.change(\\''+c.name+'\\',this.value)">' + esc(String(fields[c.name]||c.props.defaultValue||'')) + '</textarea>';
        } else {
          html += '<input type="text" placeholder="' + esc(c.props.placeholder || '') + '" value="' + esc(String(fields[c.name]||c.props.defaultValue||'')) + '" onchange="app.change(\\''+c.name+'\\',this.value)">';
        }
        html += '<div class="field-error" id="error-' + c.id + '"></div></div>';
        break;
      case 'number':
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '') +
          '<input type="number" placeholder="' + esc(c.props.placeholder || '') + '" value="' + esc(String(fields[c.name]||c.props.defaultValue||'')) + '" onchange="app.change(\\''+c.name+'\\',Number(this.value))">' +
          '<div class="field-error" id="error-' + c.id + '"></div></div>';
        break;
      case 'dropdown': {
        const opts = (c.props.options || []).map(o => '<option value="' + esc(o.value) + '"' + (fields[c.name] === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '') +
          '<select onchange="app.change(\\''+c.name+'\\',this.value)"><option value="">Select...</option>' + opts + '</select>' +
          '<div class="field-error" id="error-' + c.id + '"></div></div>';
        break;
      }
      case 'checkbox':
        html = '<div class="field"><label class="checkbox"><input type="checkbox"' + (fields[c.name] ? ' checked' : '') + ' onchange="app.change(\\''+c.name+'\\',this.checked)"><span>' + esc(c.props.label || c.name) + '</span></label></div>';
        break;
      case 'button': {
        const variant = c.props.variant || 'primary';
        html = '<button class="btn btn-' + variant + '" onclick="app.click(\\''+c.id+'\\')' + '">' + esc(c.props.label || 'Button') + '</button>';
        break;
      }
      case 'table': {
        const cols = c.props.columns || [{ key: 'col1', label: 'Column 1' }];
        html = '<div class="field">' + (c.props.label ? '<div class="field-label">' + esc(c.props.label) + '</div>' : '') +
          '<table><thead><tr>' + cols.map(col => '<th>' + esc(col.label) + '</th>').join('') + '</tr></thead><tbody></tbody></table></div>';
        break;
      }
      default:
        html = '<div>' + esc(c.type) + '</div>';
    }
    return html;
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function render() {
    const card = getCard(currentCardId);
    if (!card) return;

    let navHtml = '';
    if (stack.settings.showNavigation && stack.cards.length > 1) {
      navHtml = '<div class="nav">' + stack.cards.map(c =>
        '<button class="nav-btn' + (c.id === currentCardId ? ' active' : '') + '" onclick="app.nav(\\''+c.id+'\\')">' + esc(c.title) + '</button>'
      ).join('') + '</div>';
    }

    let msgsHtml = messages.map(m => '<div class="msg msg-' + m.type + '">' + esc(m.text) + '</div>').join('');

    const compsHtml = card.components.sort((a,b) => a.order - b.order).map(renderComponent).join('');

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
