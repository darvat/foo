/**
 * PropertyPanel - Right panel for editing component properties, rules, and AI copilot.
 */

import React, { useState, useCallback } from 'react';
import { useStackStore } from '../../store/stack-store';
import type { EditorPanel } from '../../store/stack-store';
import type { ComponentType, Action, ActionEffect, Rule } from '../../types/schema';
import { processPrompt } from '../../ai/copilot';

const COMPONENT_TYPES: Array<{ type: ComponentType; label: string; icon: string }> = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'input', label: 'Input', icon: 'Aa' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'dropdown', label: 'Dropdown', icon: 'v' },
  { type: 'checkbox', label: 'Checkbox', icon: '\u2611' },
  { type: 'button', label: 'Button', icon: '\u25A3' },
  { type: 'image', label: 'Image', icon: '\u25A1' },
  { type: 'table', label: 'Table', icon: '\u2637' },
];

const PANEL_TABS: Array<{ id: EditorPanel; label: string }> = [
  { id: 'components', label: 'Add' },
  { id: 'properties', label: 'Props' },
  { id: 'rules', label: 'Rules' },
  { id: 'data', label: 'Data' },
  { id: 'ai', label: 'AI' },
];

export const PropertyPanel: React.FC = () => {
  const { editor, setPanel } = useStackStore();

  return (
    <div className="right-panel">
      <div className="panel-tabs">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`panel-tab ${editor.activePanel === tab.id ? 'active' : ''}`}
            onClick={() => setPanel(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="panel-content">
        {editor.activePanel === 'components' && <ComponentPalette />}
        {editor.activePanel === 'properties' && <PropertiesEditor />}
        {editor.activePanel === 'rules' && <RulesEditor />}
        {editor.activePanel === 'data' && <DataPanel />}
        {editor.activePanel === 'ai' && <AICopilotPanel />}
      </div>
    </div>
  );
};

// ── Component Palette ────────────────────────────────────────────

const ComponentPalette: React.FC = () => {
  const { stack, editor, addComponent } = useStackStore();

  const handleAdd = (type: ComponentType) => {
    if (!stack || !editor.selectedCardId) return;
    const card = stack.cards.find((c) => c.id === editor.selectedCardId);
    if (!card) return;

    const baseName = type === 'text' ? 'label' : type;
    const count = card.components.filter((c) => c.type === type).length;
    const name = count === 0 ? baseName : `${baseName}${count + 1}`;

    addComponent(editor.selectedCardId, type, name);
  };

  if (!editor.selectedCardId) {
    return (
      <div className="empty-state">
        <div className="empty-state-text">Select a card first</div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-section-title">Components</div>
      <div className="component-palette">
        {COMPONENT_TYPES.map((ct) => (
          <div key={ct.type} className="palette-item" onClick={() => handleAdd(ct.type)}>
            <span className="palette-item-icon">{ct.icon}</span>
            <span className="palette-item-label">{ct.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Properties Editor ────────────────────────────────────────────

const PropertiesEditor: React.FC = () => {
  const { stack, editor, updateComponent, deleteComponent } = useStackStore();

  if (!stack || !editor.selectedCardId || !editor.selectedComponentId) {
    return (
      <div className="empty-state">
        <div className="empty-state-text">Select a component to edit its properties</div>
      </div>
    );
  }

  const card = stack.cards.find((c) => c.id === editor.selectedCardId);
  const component = card?.components.find((c) => c.id === editor.selectedComponentId);

  if (!card || !component) {
    return (
      <div className="empty-state">
        <div className="empty-state-text">Component not found</div>
      </div>
    );
  }

  const update = (updates: Record<string, unknown>) => {
    const { props: updatedProps, ...otherUpdates } = updates;
    updateComponent(card.id, component.id, {
      ...otherUpdates,
      props: { ...component.props, ...(updatedProps as Record<string, unknown> ?? {}) },
    });
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-section-title">Component</div>
        <div className="property-row">
          <div className="property-label">Name</div>
          <input
            className="property-input"
            value={component.name}
            onChange={(e) => updateComponent(card.id, component.id, { name: e.target.value })}
          />
        </div>
        <div className="property-row">
          <div className="property-label">Type</div>
          <input className="property-input" value={component.type} readOnly disabled />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Properties</div>
        <div className="property-row">
          <div className="property-label">Label</div>
          <input
            className="property-input"
            value={component.props.label || ''}
            onChange={(e) => update({ props: { label: e.target.value } })}
          />
        </div>

        {(component.type === 'input' || component.type === 'number') && (
          <div className="property-row">
            <div className="property-label">Placeholder</div>
            <input
              className="property-input"
              value={component.props.placeholder || ''}
              onChange={(e) => update({ props: { placeholder: e.target.value } })}
            />
          </div>
        )}

        {component.type === 'text' && (
          <div className="property-row">
            <div className="property-label">Font Size</div>
            <select
              className="property-select"
              value={component.props.fontSize || 'md'}
              onChange={(e) => update({ props: { fontSize: e.target.value } })}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra Large</option>
            </select>
          </div>
        )}

        {component.type === 'button' && (
          <div className="property-row">
            <div className="property-label">Variant</div>
            <select
              className="property-select"
              value={component.props.variant || 'primary'}
              onChange={(e) => update({ props: { variant: e.target.value } })}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="danger">Danger</option>
              <option value="link">Link</option>
            </select>
          </div>
        )}

        {component.type === 'dropdown' && (
          <div className="property-row">
            <div className="property-label">Options (one per line: label=value)</div>
            <textarea
              className="property-textarea"
              value={
                component.props.options?.map((o) => `${o.label}=${o.value}`).join('\n') || ''
              }
              onChange={(e) => {
                const options = e.target.value
                  .split('\n')
                  .filter((l) => l.trim())
                  .map((line) => {
                    const [label, ...rest] = line.split('=');
                    const value = rest.join('=') || label;
                    return { label: label.trim(), value: value.trim() };
                  });
                update({ props: { options } });
              }}
              rows={4}
            />
          </div>
        )}
      </div>

      <div className="panel-section">
        <button
          className="btn btn-danger btn-sm"
          onClick={() => deleteComponent(card.id, component.id)}
          style={{ width: '100%' }}
        >
          Delete Component
        </button>
      </div>
    </div>
  );
};

// ── Rules Editor ─────────────────────────────────────────────────

const RulesEditor: React.FC = () => {
  const { stack, editor, addRule, addAction, deleteRule, deleteAction } = useStackStore();
  const [showAddRule, setShowAddRule] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newActionTrigger, setNewActionTrigger] = useState<Action['trigger']>('onClick');
  const [newActionEffectType, setNewActionEffectType] = useState<string>('navigate');

  if (!stack || !editor.selectedCardId) {
    return (
      <div className="empty-state">
        <div className="empty-state-text">Select a card to manage its rules and actions</div>
      </div>
    );
  }

  const card = stack.cards.find((c) => c.id === editor.selectedCardId);
  if (!card) return null;

  const handleAddRule = () => {
    if (!newRuleName.trim() || !newRuleCondition.trim()) return;
    const rule: Omit<Rule, 'id'> = {
      name: newRuleName,
      condition: newRuleCondition,
      thenEffects: [{ type: 'showMessage', message: 'Condition met!' }],
      active: true,
    };
    addRule(card.id, rule);
    setNewRuleName('');
    setNewRuleCondition('');
    setShowAddRule(false);
  };

  const handleAddAction = () => {
    const effects: ActionEffect[] = [];
    if (newActionEffectType === 'navigate' && stack.cards.length > 1) {
      const targetCard = stack.cards.find((c) => c.id !== card.id);
      if (targetCard) effects.push({ type: 'navigate', cardId: targetCard.id });
    } else if (newActionEffectType === 'showMessage') {
      effects.push({ type: 'showMessage', message: 'Action triggered!' });
    } else if (newActionEffectType === 'validate') {
      effects.push({ type: 'validate' });
    }

    if (effects.length === 0) {
      effects.push({ type: 'showMessage', message: 'Action triggered!' });
    }

    const action: Omit<Action, 'id'> = {
      trigger: newActionTrigger,
      effects,
    };
    addAction(card.id, action);
    setShowAddAction(false);
  };

  return (
    <div>
      <div className="panel-section">
        <div className="flex items-center justify-between mb-2">
          <div className="panel-section-title" style={{ marginBottom: 0 }}>
            Rules ({card.rules.length})
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowAddRule(!showAddRule)}>
            +
          </button>
        </div>

        {showAddRule && (
          <div style={{ marginBottom: 12 }}>
            <input
              className="property-input mb-2"
              placeholder="Rule name"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
            />
            <textarea
              className="property-textarea mb-2"
              placeholder="Condition (e.g., fields.amount > 1000)"
              value={newRuleCondition}
              onChange={(e) => setNewRuleCondition(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={handleAddRule}>
                Add Rule
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddRule(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {card.rules.map((rule) => (
          <div key={rule.id} className="rule-item">
            <div className="rule-item-header">
              <span className="rule-item-name">{rule.name}</span>
              <button
                className="btn btn-link btn-sm"
                onClick={() => deleteRule(card.id, rule.id)}
                style={{ color: 'var(--color-danger)', fontSize: 11 }}
              >
                delete
              </button>
            </div>
            <div className="rule-item-condition">if: {rule.condition}</div>
            <div className="rule-item-effects">
              then: {rule.thenEffects.map((e) => e.type).join(', ')}
            </div>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="flex items-center justify-between mb-2">
          <div className="panel-section-title" style={{ marginBottom: 0 }}>
            Actions ({card.actions.length})
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowAddAction(!showAddAction)}
          >
            +
          </button>
        </div>

        {showAddAction && (
          <div style={{ marginBottom: 12 }}>
            <div className="property-row">
              <div className="property-label">Trigger</div>
              <select
                className="property-select"
                value={newActionTrigger}
                onChange={(e) => setNewActionTrigger(e.target.value as Action['trigger'])}
              >
                <option value="onClick">onClick</option>
                <option value="onChange">onChange</option>
                <option value="onOpen">onOpen</option>
                <option value="onSubmit">onSubmit</option>
              </select>
            </div>
            <div className="property-row">
              <div className="property-label">Effect</div>
              <select
                className="property-select"
                value={newActionEffectType}
                onChange={(e) => setNewActionEffectType(e.target.value)}
              >
                <option value="navigate">Navigate to card</option>
                <option value="showMessage">Show message</option>
                <option value="validate">Validate fields</option>
                <option value="setValue">Set value</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={handleAddAction}>
                Add
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddAction(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {card.actions.map((action) => (
          <div key={action.id} className="action-item">
            <div className="flex items-center justify-between">
              <span className="action-trigger">{action.trigger}</span>
              <button
                className="btn btn-link btn-sm"
                onClick={() => deleteAction(card.id, action.id)}
                style={{ color: 'var(--color-danger)', fontSize: 11 }}
              >
                delete
              </button>
            </div>
            {action.effects.map((effect, i) => (
              <div key={i} className="action-effect">
                {describeEffect(effect, stack)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

function describeEffect(effect: ActionEffect, stack: { cards: Array<{ id: string; title: string }> }): string {
  switch (effect.type) {
    case 'navigate': {
      const card = stack.cards.find((c) => c.id === effect.cardId);
      return `-> navigate to "${card?.title || effect.cardId}"`;
    }
    case 'setValue':
      return `-> set ${effect.target} = ${effect.expression}`;
    case 'showMessage':
      return `-> show "${effect.message}"`;
    case 'runFormula':
      return `-> ${effect.output} = ${effect.formula}`;
    case 'setVisibility':
      return `-> visibility(${effect.target}) = ${effect.expression}`;
    case 'validate':
      return '-> validate fields';
    case 'submitData':
      return `-> submit to ${effect.dataSourceId}`;
    case 'exportCsv':
      return `-> export CSV from ${effect.dataSourceId}`;
    case 'importCsv':
      return `-> import CSV to ${effect.dataSourceId}`;
  }
}

// ── Data Panel ───────────────────────────────────────────────────

const DataPanel: React.FC = () => {
  const { stack, addDataSource, deleteDataSource } = useStackStore();
  const [showAdd, setShowAdd] = useState(false);
  const [dsName, setDsName] = useState('');

  if (!stack) return null;

  const handleAdd = () => {
    if (!dsName.trim()) return;
    addDataSource({
      name: dsName,
      columns: [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'name', label: 'Name', type: 'text' },
      ],
      records: [],
    });
    setDsName('');
    setShowAdd(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="panel-section-title" style={{ marginBottom: 0 }}>
          Data Sources ({stack.dataSources.length})
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(!showAdd)}>
          +
        </button>
      </div>

      {showAdd && (
        <div style={{ marginBottom: 12 }}>
          <input
            className="property-input mb-2"
            placeholder="Data source name"
            value={dsName}
            onChange={(e) => setDsName(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={handleAdd}>
              Create
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stack.dataSources.map((ds) => (
        <div key={ds.id} className="rule-item">
          <div className="rule-item-header">
            <span className="rule-item-name">{ds.name}</span>
            <button
              className="btn btn-link btn-sm"
              onClick={() => deleteDataSource(ds.id)}
              style={{ color: 'var(--color-danger)', fontSize: 11 }}
            >
              delete
            </button>
          </div>
          <div className="rule-item-effects">
            {ds.columns.length} columns, {ds.records.length} records
          </div>
        </div>
      ))}

      {stack.dataSources.length === 0 && !showAdd && (
        <div className="empty-state" style={{ padding: '20px 0' }}>
          <div className="empty-state-text text-sm">
            No data sources yet. Add one to store records locally.
          </div>
        </div>
      )}
    </div>
  );
};

// ── AI Copilot Panel ─────────────────────────────────────────────

const AICopilotPanel: React.FC = () => {
  const { stack, aiMessages, aiLoading, addAiMessage, setAiLoading, applyAiResult } =
    useStackStore();
  const [input, setInput] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [aiMessages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || aiLoading) return;

    addAiMessage('user', trimmed);
    setInput('');
    setAiLoading(true);

    try {
      const result = await processPrompt(trimmed, stack, aiMessages);

      addAiMessage('assistant', result.message);

      if (result.cards || result.components || result.rules) {
        applyAiResult(result.cards, result.components, result.rules);
      }
    } catch (err) {
      addAiMessage('assistant', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-messages">
        {aiMessages.length === 0 && (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-state-text text-sm">
              Describe what you want to build and the AI will generate cards, fields, and logic for
              you.
            </div>
            <div className="text-sm text-muted" style={{ marginTop: 8 }}>
              Try: "Create a customer intake form with validation"
            </div>
          </div>
        )}
        {aiMessages.map((msg, i) => (
          <div key={i} className={`ai-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {aiLoading && (
          <div className="ai-message assistant" style={{ opacity: 0.6 }}>
            Generating...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="ai-input-area">
        <textarea
          className="ai-input"
          placeholder="Describe what to build..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={aiLoading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};
