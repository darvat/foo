/**
 * CardStack AI - Zustand Store
 *
 * Central state management for the editor and runtime.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Stack,
  Card,
  Component,
  ComponentType,
  Action,
  Rule,
  DataSource,
  RuntimeState,
  StackTemplate,
} from '../types/schema';
import { createDefaultStack, createDefaultCard, createDefaultComponent } from '../types/schema';
import { evaluateRules, executeActions, validateCard, executeEffects } from '../engine/rule-engine';
import type { EngineCallbacks } from '../engine/rule-engine';

// ── Types ────────────────────────────────────────────────────────

export type EditorMode = 'edit' | 'preview';
export type EditorPanel = 'components' | 'properties' | 'rules' | 'data' | 'ai';

interface EditorState {
  mode: EditorMode;
  activePanel: EditorPanel;
  selectedCardId: string | null;
  selectedComponentId: string | null;
  isDirty: boolean;
}

interface AppState {
  // Stack data
  stack: Stack | null;
  recentStacks: Array<{ id: string; name: string; updatedAt: string }>;

  // Editor state
  editor: EditorState;

  // Runtime state (preview mode)
  runtime: RuntimeState;

  // AI Copilot
  aiMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  aiLoading: boolean;

  // Stack operations
  createStack: (name: string) => void;
  clearStack: () => void;
  loadStack: (stack: Stack) => void;
  loadTemplate: (template: StackTemplate) => void;
  updateStackSettings: (settings: Partial<Stack['settings']>) => void;
  updateStackName: (name: string) => void;

  // Card operations
  addCard: (title: string) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  selectCard: (cardId: string | null) => void;

  // Component operations
  addComponent: (cardId: string, type: ComponentType, name: string) => void;
  updateComponent: (cardId: string, componentId: string, updates: Partial<Component>) => void;
  deleteComponent: (cardId: string, componentId: string) => void;
  selectComponent: (componentId: string | null) => void;
  reorderComponents: (cardId: string, fromIndex: number, toIndex: number) => void;

  // Action operations
  addAction: (cardId: string, action: Omit<Action, 'id'>) => void;
  updateAction: (cardId: string, actionId: string, updates: Partial<Action>) => void;
  deleteAction: (cardId: string, actionId: string) => void;

  // Rule operations
  addRule: (cardId: string, rule: Omit<Rule, 'id'>) => void;
  updateRule: (cardId: string, ruleId: string, updates: Partial<Rule>) => void;
  deleteRule: (cardId: string, ruleId: string) => void;

  // Data source operations
  addDataSource: (dataSource: Omit<DataSource, 'id'>) => void;
  updateDataSource: (id: string, updates: Partial<DataSource>) => void;
  deleteDataSource: (id: string) => void;
  addRecord: (dataSourceId: string, record: Record<string, unknown>) => void;

  // Editor operations
  setMode: (mode: EditorMode) => void;
  setPanel: (panel: EditorPanel) => void;

  // Runtime operations
  setFieldValue: (name: string, value: unknown) => void;
  navigateToCard: (cardId: string) => void;
  triggerAction: (trigger: Action['trigger'], componentId?: string) => void;
  runRules: () => void;
  validateCurrentCard: (componentIds?: string[]) => Record<string, string>;
  resetRuntime: () => void;

  // AI operations
  addAiMessage: (role: 'user' | 'assistant', content: string) => void;
  setAiLoading: (loading: boolean) => void;
  applyAiResult: (cards?: Card[], components?: { cardId: string; components: Component[] }[], rules?: { cardId: string; rules: Rule[] }[]) => void;

  // Serialization
  exportStack: () => string;
  importStack: (json: string) => boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

function findCard(stack: Stack, cardId: string): Card | undefined {
  return stack.cards.find((c) => c.id === cardId);
}

// ── Store ────────────────────────────────────────────────────────

export const useStackStore = create<AppState>()(
  immer((set, get) => {
    // Engine callbacks wired to the store
    const getCallbacks = (): EngineCallbacks => ({
      onNavigate: (cardId: string) => get().navigateToCard(cardId),
      onSetValue: (target: string, value: unknown) => get().setFieldValue(target, value),
      onShowMessage: (message: string, type?: string) => {
        set((s) => {
          s.runtime.messages.push({
            type: (type as 'info' | 'success' | 'warning' | 'error') || 'info',
            text: message,
          });
        });
      },
      onValidate: (componentIds?: string[]) => {
        const errors = get().validateCurrentCard(componentIds);
        return Object.keys(errors).length === 0;
      },
      onExportCsv: (_dataSourceId: string) => {
        // CSV export handled externally
      },
      onImportCsv: (_dataSourceId: string) => {
        // CSV import handled externally
      },
    });

    return {
      // Initial state
      stack: null,
      recentStacks: [],

      editor: {
        mode: 'edit',
        activePanel: 'components',
        selectedCardId: null,
        selectedComponentId: null,
        isDirty: false,
      },

      runtime: {
        currentCardId: '',
        fields: {},
        errors: {},
        messages: [],
        dataRecords: {},
      },

      aiMessages: [],
      aiLoading: false,

      // ── Stack operations ─────────────────────────────────────

      createStack: (name: string) => {
        const stack = createDefaultStack(name);
        const firstCard = createDefaultCard('Welcome', 0);
        stack.cards.push(firstCard);
        set((s) => {
          s.stack = stack;
          s.editor.selectedCardId = firstCard.id;
          s.editor.isDirty = false;
          s.runtime.currentCardId = firstCard.id;
        });
      },

      clearStack: () => {
        set((s) => {
          s.stack = null;
          s.editor.selectedCardId = null;
          s.editor.selectedComponentId = null;
          s.editor.isDirty = false;
          s.editor.mode = 'edit';
          s.runtime = { currentCardId: '', fields: {}, errors: {}, messages: [], dataRecords: {} };
          s.aiMessages = [];
          s.aiLoading = false;
        });
      },

      loadStack: (stack: Stack) => {
        set((s) => {
          s.stack = stack;
          s.editor.selectedCardId = stack.cards[0]?.id ?? null;
          s.editor.isDirty = false;
          s.runtime.currentCardId = stack.cards[0]?.id ?? '';
          s.runtime.fields = {};
          s.runtime.errors = {};
          s.runtime.messages = [];
        });
      },

      loadTemplate: (template: StackTemplate) => {
        const stack: Stack = {
          ...template.stack,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        get().loadStack(stack);
      },

      updateStackSettings: (settings) => {
        set((s) => {
          if (s.stack) {
            Object.assign(s.stack.settings, settings);
            s.stack.updatedAt = new Date().toISOString();
            s.editor.isDirty = true;
          }
        });
      },

      updateStackName: (name: string) => {
        set((s) => {
          if (s.stack) {
            s.stack.name = name;
            s.stack.updatedAt = new Date().toISOString();
            s.editor.isDirty = true;
          }
        });
      },

      // ── Card operations ──────────────────────────────────────

      addCard: (title: string) => {
        set((s) => {
          if (!s.stack) return;
          const card = createDefaultCard(title, s.stack.cards.length);
          s.stack.cards.push(card);
          s.editor.selectedCardId = card.id;
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      updateCard: (cardId, updates) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (card) {
            Object.assign(card, updates);
            s.stack.updatedAt = new Date().toISOString();
            s.editor.isDirty = true;
          }
        });
      },

      deleteCard: (cardId) => {
        set((s) => {
          if (!s.stack) return;
          s.stack.cards = s.stack.cards.filter((c) => c.id !== cardId);
          if (s.editor.selectedCardId === cardId) {
            s.editor.selectedCardId = s.stack.cards[0]?.id ?? null;
          }
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      reorderCards: (fromIndex, toIndex) => {
        set((s) => {
          if (!s.stack) return;
          const cards = s.stack.cards;
          const [moved] = cards.splice(fromIndex, 1);
          cards.splice(toIndex, 0, moved);
          cards.forEach((c, i) => (c.order = i));
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      selectCard: (cardId) => {
        set((s) => {
          s.editor.selectedCardId = cardId;
          s.editor.selectedComponentId = null;
        });
      },

      // ── Component operations ─────────────────────────────────

      addComponent: (cardId, type, name) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          const component = createDefaultComponent(type, name, card.components.length);
          card.components.push(component);
          s.editor.selectedComponentId = component.id;
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      updateComponent: (cardId, componentId, updates) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          const comp = card.components.find((c) => c.id === componentId);
          if (comp) {
            Object.assign(comp, updates);
            s.stack.updatedAt = new Date().toISOString();
            s.editor.isDirty = true;
          }
        });
      },

      deleteComponent: (cardId, componentId) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          card.components = card.components.filter((c) => c.id !== componentId);
          if (s.editor.selectedComponentId === componentId) {
            s.editor.selectedComponentId = null;
          }
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      selectComponent: (componentId) => {
        set((s) => {
          s.editor.selectedComponentId = componentId;
        });
      },

      reorderComponents: (cardId, fromIndex, toIndex) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          const comps = card.components;
          const [moved] = comps.splice(fromIndex, 1);
          comps.splice(toIndex, 0, moved);
          comps.forEach((c, i) => (c.order = i));
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      // ── Action operations ────────────────────────────────────

      addAction: (cardId, action) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          card.actions.push({ ...action, id: crypto.randomUUID() });
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      updateAction: (cardId, actionId, updates) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          const action = card.actions.find((a) => a.id === actionId);
          if (action) Object.assign(action, updates);
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      deleteAction: (cardId, actionId) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          card.actions = card.actions.filter((a) => a.id !== actionId);
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      // ── Rule operations ──────────────────────────────────────

      addRule: (cardId, rule) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          card.rules.push({ ...rule, id: crypto.randomUUID() });
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      updateRule: (cardId, ruleId, updates) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          const rule = card.rules.find((r) => r.id === ruleId);
          if (rule) Object.assign(rule, updates);
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      deleteRule: (cardId, ruleId) => {
        set((s) => {
          if (!s.stack) return;
          const card = findCard(s.stack, cardId);
          if (!card) return;
          card.rules = card.rules.filter((r) => r.id !== ruleId);
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      // ── Data source operations ───────────────────────────────

      addDataSource: (ds) => {
        set((s) => {
          if (!s.stack) return;
          s.stack.dataSources.push({ ...ds, id: crypto.randomUUID() });
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      updateDataSource: (id, updates) => {
        set((s) => {
          if (!s.stack) return;
          const ds = s.stack.dataSources.find((d) => d.id === id);
          if (ds) Object.assign(ds, updates);
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      deleteDataSource: (id) => {
        set((s) => {
          if (!s.stack) return;
          s.stack.dataSources = s.stack.dataSources.filter((d) => d.id !== id);
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      addRecord: (dataSourceId, record) => {
        set((s) => {
          if (!s.stack) return;
          const ds = s.stack.dataSources.find((d) => d.id === dataSourceId);
          if (ds) {
            ds.records.push({ id: crypto.randomUUID(), ...record });
          }
          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      // ── Editor operations ────────────────────────────────────

      setMode: (mode) => {
        set((s) => {
          s.editor.mode = mode;
          if (mode === 'preview') {
            // Initialize runtime
            s.runtime.currentCardId = s.stack?.cards[0]?.id ?? '';
            s.runtime.fields = {};
            s.runtime.errors = {};
            s.runtime.messages = [];
            // Initialize data records
            if (s.stack) {
              for (const ds of s.stack.dataSources) {
                s.runtime.dataRecords[ds.id] = [...ds.records];
              }
            }
          }
        });
        // Run onOpen actions when entering preview
        if (mode === 'preview') {
          const state = get();
          if (state.stack) {
            const card = findCard(state.stack, state.runtime.currentCardId);
            if (card) {
              executeActions('onOpen', undefined, card, state.runtime, state.stack, getCallbacks());
              evaluateRules(card, state.runtime, state.stack, getCallbacks());
            }
          }
        }
      },

      setPanel: (panel) => {
        set((s) => {
          s.editor.activePanel = panel;
        });
      },

      // ── Runtime operations ───────────────────────────────────

      setFieldValue: (name, value) => {
        set((s) => {
          s.runtime.fields[name] = value;
        });
      },

      navigateToCard: (cardId) => {
        set((s) => {
          s.runtime.currentCardId = cardId;
          s.runtime.messages = [];
        });
        // Run onOpen for the new card
        const state = get();
        if (state.stack) {
          const card = findCard(state.stack, cardId);
          if (card) {
            executeActions('onOpen', undefined, card, state.runtime, state.stack, getCallbacks());
            evaluateRules(card, state.runtime, state.stack, getCallbacks());
          }
        }
      },

      triggerAction: (trigger, componentId) => {
        const state = get();
        if (!state.stack) return;
        const card = findCard(state.stack, state.runtime.currentCardId);
        if (!card) return;
        executeActions(trigger, componentId, card, state.runtime, state.stack, getCallbacks());
      },

      runRules: () => {
        const state = get();
        if (!state.stack) return;
        const card = findCard(state.stack, state.runtime.currentCardId);
        if (!card) return;
        evaluateRules(card, state.runtime, state.stack, getCallbacks());
      },

      validateCurrentCard: (componentIds) => {
        const state = get();
        if (!state.stack) return {};
        const card = findCard(state.stack, state.runtime.currentCardId);
        if (!card) return {};
        const errors = validateCard(card, state.runtime, componentIds);
        set((s) => {
          s.runtime.errors = { ...s.runtime.errors, ...errors };
        });
        return errors;
      },

      resetRuntime: () => {
        set((s) => {
          s.runtime = {
            currentCardId: s.stack?.cards[0]?.id ?? '',
            fields: {},
            errors: {},
            messages: [],
            dataRecords: {},
          };
        });
      },

      // ── AI operations ────────────────────────────────────────

      addAiMessage: (role, content) => {
        set((s) => {
          s.aiMessages.push({ role, content });
        });
      },

      setAiLoading: (loading) => {
        set((s) => {
          s.aiLoading = loading;
        });
      },

      applyAiResult: (cards, components, rules) => {
        set((s) => {
          if (!s.stack) return;

          // Add new cards
          if (cards) {
            for (const card of cards) {
              card.order = s.stack.cards.length;
              s.stack.cards.push(card);
            }
            if (cards.length > 0) {
              s.editor.selectedCardId = cards[0].id;
            }
          }

          // Add components to existing cards
          if (components) {
            for (const { cardId, components: comps } of components) {
              const card = findCard(s.stack!, cardId);
              if (card) {
                for (const comp of comps) {
                  comp.order = card.components.length;
                  card.components.push(comp);
                }
              }
            }
          }

          // Add rules to existing cards
          if (rules) {
            for (const { cardId, rules: cardRules } of rules) {
              const card = findCard(s.stack!, cardId);
              if (card) {
                card.rules.push(...cardRules);
              }
            }
          }

          s.stack.updatedAt = new Date().toISOString();
          s.editor.isDirty = true;
        });
      },

      // ── Serialization ────────────────────────────────────────

      exportStack: () => {
        const { stack } = get();
        if (!stack) return '{}';
        return JSON.stringify(stack, null, 2);
      },

      importStack: (json) => {
        try {
          const stack = JSON.parse(json) as Stack;
          if (!stack.id || !stack.cards) return false;
          get().loadStack(stack);
          return true;
        } catch {
          return false;
        }
      },
    };
  })
);
