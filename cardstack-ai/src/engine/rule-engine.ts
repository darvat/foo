/**
 * CardStack AI - Rule Engine
 *
 * Evaluates rules and executes actions based on the current runtime state.
 */

import type { Action, ActionEffect, Card, Rule, Stack, RuntimeState } from '../types/schema';
import { evaluateCondition, evaluateExpression, ExpressionContext } from './expression';

export interface EngineCallbacks {
  onNavigate: (cardId: string) => void;
  onSetValue: (target: string, value: unknown) => void;
  onShowMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onValidate: (componentIds?: string[]) => boolean;
  onExportCsv: (dataSourceId: string) => void;
  onImportCsv: (dataSourceId: string) => void;
}

function buildExpressionContext(state: RuntimeState, stack: Stack): ExpressionContext {
  return {
    fields: { ...state.fields },
    data: { ...state.dataRecords },
    variables: { ...stack.variables },
    currentCard: state.currentCardId,
  };
}

function executeEffect(
  effect: ActionEffect,
  ctx: ExpressionContext,
  callbacks: EngineCallbacks
): void {
  switch (effect.type) {
    case 'navigate':
      callbacks.onNavigate(effect.cardId);
      break;

    case 'setValue': {
      const value = evaluateExpression(effect.expression, ctx);
      callbacks.onSetValue(effect.target, value);
      break;
    }

    case 'showMessage':
      callbacks.onShowMessage(effect.message);
      break;

    case 'submitData':
      // Data submission handled by store
      break;

    case 'runFormula': {
      const result = evaluateExpression(effect.formula, ctx);
      callbacks.onSetValue(effect.output, result);
      break;
    }

    case 'setVisibility': {
      const visible = evaluateExpression(effect.expression, ctx);
      callbacks.onSetValue(`__visibility.${effect.target}`, visible);
      break;
    }

    case 'validate':
      callbacks.onValidate(effect.componentIds);
      break;

    case 'exportCsv':
      callbacks.onExportCsv(effect.dataSourceId);
      break;

    case 'importCsv':
      callbacks.onImportCsv(effect.dataSourceId);
      break;
  }
}

/**
 * Execute a list of effects.
 */
export function executeEffects(
  effects: ActionEffect[],
  state: RuntimeState,
  stack: Stack,
  callbacks: EngineCallbacks
): void {
  const ctx = buildExpressionContext(state, stack);
  for (const effect of effects) {
    executeEffect(effect, ctx, callbacks);
  }
}

/**
 * Evaluate and execute all rules for a given card.
 */
export function evaluateRules(
  card: Card,
  state: RuntimeState,
  stack: Stack,
  callbacks: EngineCallbacks
): void {
  const ctx = buildExpressionContext(state, stack);

  for (const rule of card.rules) {
    if (!rule.active) continue;

    try {
      const conditionMet = evaluateCondition(rule.condition, ctx);
      if (conditionMet) {
        for (const effect of rule.thenEffects) {
          executeEffect(effect, ctx, callbacks);
        }
      } else if (rule.elseEffects) {
        for (const effect of rule.elseEffects) {
          executeEffect(effect, ctx, callbacks);
        }
      }
    } catch {
      console.warn(`Rule "${rule.name}" failed to evaluate:`, rule.condition);
    }
  }
}

/**
 * Execute actions matching a given trigger on a card.
 */
export function executeActions(
  trigger: Action['trigger'],
  componentId: string | undefined,
  card: Card,
  state: RuntimeState,
  stack: Stack,
  callbacks: EngineCallbacks
): void {
  const ctx = buildExpressionContext(state, stack);
  const matchingActions = card.actions.filter(
    (a) =>
      a.trigger === trigger &&
      (componentId === undefined || a.componentId === undefined || a.componentId === componentId)
  );

  for (const action of matchingActions) {
    if (action.condition) {
      try {
        if (!evaluateCondition(action.condition, ctx)) continue;
      } catch {
        console.warn(`Action condition failed:`, action.condition);
        continue;
      }
    }

    for (const effect of action.effects) {
      executeEffect(effect, ctx, callbacks);
    }
  }
}

/**
 * Validate components on a card using their validation rules.
 */
export function validateCard(
  card: Card,
  state: RuntimeState,
  componentIds?: string[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  const components = componentIds
    ? card.components.filter((c) => componentIds.includes(c.id))
    : card.components;

  for (const component of components) {
    if (!component.validation) continue;

    const value = state.fields[component.name];

    for (const rule of component.validation) {
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors[component.id] = rule.message;
          }
          break;
        case 'min':
          if (Number(value) < Number(rule.value)) {
            errors[component.id] = rule.message;
          }
          break;
        case 'max':
          if (Number(value) > Number(rule.value)) {
            errors[component.id] = rule.message;
          }
          break;
        case 'minLength':
          if (String(value || '').length < Number(rule.value)) {
            errors[component.id] = rule.message;
          }
          break;
        case 'maxLength':
          if (String(value || '').length > Number(rule.value)) {
            errors[component.id] = rule.message;
          }
          break;
        case 'pattern':
          if (!new RegExp(String(rule.value)).test(String(value || ''))) {
            errors[component.id] = rule.message;
          }
          break;
      }
    }
  }

  return errors;
}

/**
 * Lint a stack's rules and actions for common issues.
 */
export function lintStack(stack: Stack): Array<{ cardId: string; ruleId?: string; actionId?: string; message: string; severity: 'error' | 'warning' }> {
  const issues: Array<{ cardId: string; ruleId?: string; actionId?: string; message: string; severity: 'error' | 'warning' }> = [];
  const cardIds = new Set(stack.cards.map((c) => c.id));
  const componentNames = new Set(stack.cards.flatMap((c) => c.components.map((comp) => comp.name)));
  const dataSourceIds = new Set(stack.dataSources.map((ds) => ds.id));

  for (const card of stack.cards) {
    // Lint rules
    for (const rule of card.rules) {
      if (!rule.condition.trim()) {
        issues.push({ cardId: card.id, ruleId: rule.id, message: `Rule "${rule.name}" has empty condition`, severity: 'error' });
      }
      for (const effect of [...rule.thenEffects, ...(rule.elseEffects || [])]) {
        lintEffect(effect, card.id, cardIds, componentNames, dataSourceIds, issues, rule.id);
      }
    }

    // Lint actions
    for (const action of card.actions) {
      for (const effect of action.effects) {
        lintEffect(effect, card.id, cardIds, componentNames, dataSourceIds, issues, undefined, action.id);
      }
    }
  }

  return issues;
}

function lintEffect(
  effect: ActionEffect,
  cardId: string,
  cardIds: Set<string>,
  _componentNames: Set<string>,
  dataSourceIds: Set<string>,
  issues: Array<{ cardId: string; ruleId?: string; actionId?: string; message: string; severity: 'error' | 'warning' }>,
  ruleId?: string,
  actionId?: string
): void {
  switch (effect.type) {
    case 'navigate':
      if (!cardIds.has(effect.cardId)) {
        issues.push({ cardId, ruleId, actionId, message: `Navigate references non-existent card: ${effect.cardId}`, severity: 'error' });
      }
      break;
    case 'submitData':
    case 'exportCsv':
    case 'importCsv':
      if (!dataSourceIds.has(effect.dataSourceId)) {
        issues.push({ cardId, ruleId, actionId, message: `References non-existent data source: ${effect.dataSourceId}`, severity: 'error' });
      }
      break;
  }
}
