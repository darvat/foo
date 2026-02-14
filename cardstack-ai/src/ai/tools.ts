/**
 * CardStack AI - AI Function-Calling Tools
 *
 * Defines the tools available to the AI copilot for generating
 * and modifying stacks.
 */

import type {
  Card,
  Component,
  ComponentType,
  Rule,
  Action,
  ActionEffect,
  ValidationRule,
  DataSource,
  Stack,
} from '../types/schema';
import { createDefaultCard, createDefaultComponent } from '../types/schema';
import { lintStack } from '../engine/rule-engine';

// ── Tool definitions for LLM function calling ────────────────────

export const AI_TOOL_DEFINITIONS = [
  {
    name: 'create_cards',
    description:
      'Create one or more cards (screens/views) for the stack. Each card can have components and actions.',
    parameters: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Card title' },
              description: { type: 'string', description: 'Optional card description' },
              components: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['text', 'input', 'number', 'dropdown', 'checkbox', 'button', 'image', 'table'],
                    },
                    name: { type: 'string', description: 'Unique field/component name' },
                    label: { type: 'string' },
                    placeholder: { type: 'string' },
                    defaultValue: {},
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          value: { type: 'string' },
                        },
                      },
                    },
                    validation: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', enum: ['required', 'min', 'max', 'minLength', 'maxLength', 'pattern'] },
                          value: {},
                          message: { type: 'string' },
                        },
                      },
                    },
                    variant: { type: 'string', enum: ['primary', 'secondary', 'danger', 'link'] },
                    fontSize: { type: 'string', enum: ['sm', 'md', 'lg', 'xl'] },
                  },
                  required: ['type', 'name'],
                },
              },
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    trigger: { type: 'string', enum: ['onOpen', 'onClick', 'onChange', 'onSubmit'] },
                    componentName: { type: 'string', description: 'Name of the component that triggers this action' },
                    condition: { type: 'string', description: 'Optional expression condition' },
                    effects: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                            enum: ['navigate', 'setValue', 'showMessage', 'submitData', 'runFormula', 'setVisibility', 'validate'],
                          },
                          cardTitle: { type: 'string', description: 'For navigate: title of target card' },
                          target: { type: 'string' },
                          expression: { type: 'string' },
                          formula: { type: 'string' },
                          output: { type: 'string' },
                          message: { type: 'string' },
                        },
                        required: ['type'],
                      },
                    },
                  },
                },
              },
            },
            required: ['title'],
          },
        },
      },
      required: ['cards'],
    },
  },
  {
    name: 'add_components',
    description: 'Add components to an existing card.',
    parameters: {
      type: 'object',
      properties: {
        cardTitle: { type: 'string', description: 'Title of the card to add components to' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['text', 'input', 'number', 'dropdown', 'checkbox', 'button', 'image', 'table'],
              },
              name: { type: 'string' },
              label: { type: 'string' },
              placeholder: { type: 'string' },
              defaultValue: {},
              options: { type: 'array' },
              validation: { type: 'array' },
              variant: { type: 'string' },
            },
            required: ['type', 'name'],
          },
        },
      },
      required: ['cardTitle', 'components'],
    },
  },
  {
    name: 'generate_rules',
    description: 'Generate if/then rules for a card.',
    parameters: {
      type: 'object',
      properties: {
        cardTitle: { type: 'string', description: 'Title of the card to add rules to' },
        rules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              condition: { type: 'string', description: 'Expression to evaluate' },
              thenEffects: { type: 'array', description: 'Effects when condition is true' },
              elseEffects: { type: 'array', description: 'Effects when condition is false' },
            },
            required: ['name', 'condition', 'thenEffects'],
          },
        },
      },
      required: ['cardTitle', 'rules'],
    },
  },
  {
    name: 'lint_and_repair_logic',
    description: 'Analyze the current stack for logic errors and suggest fixes.',
    parameters: {
      type: 'object',
      properties: {
        autoFix: { type: 'boolean', description: 'Whether to automatically apply fixes' },
      },
    },
  },
];

// ── Tool execution ───────────────────────────────────────────────

interface CardSpec {
  title: string;
  description?: string;
  components?: Array<{
    type: ComponentType;
    name: string;
    label?: string;
    placeholder?: string;
    defaultValue?: unknown;
    options?: Array<{ label: string; value: string }>;
    validation?: ValidationRule[];
    variant?: string;
    fontSize?: string;
    multiline?: boolean;
    rows?: number;
  }>;
  actions?: Array<{
    trigger: Action['trigger'];
    componentName?: string;
    condition?: string;
    effects: Array<{
      type: string;
      cardTitle?: string;
      target?: string;
      expression?: string;
      formula?: string;
      output?: string;
      message?: string;
      dataSourceId?: string;
    }>;
  }>;
}

/**
 * Convert AI-generated card specifications into proper Card objects.
 * Also resolves cross-references (like navigate to card by title).
 */
export function processCreateCards(
  specs: CardSpec[],
  existingCards: Card[] = []
): Card[] {
  const cards: Card[] = [];
  const startOrder = existingCards.length;

  // First pass: create all cards
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const card = createDefaultCard(spec.title, startOrder + i);
    if (spec.description) card.description = spec.description;

    // Add components
    if (spec.components) {
      for (let j = 0; j < spec.components.length; j++) {
        const compSpec = spec.components[j];
        const component = createDefaultComponent(compSpec.type, compSpec.name, j);
        component.props = {
          label: compSpec.label || compSpec.name,
          placeholder: compSpec.placeholder,
          defaultValue: compSpec.defaultValue as string | number | boolean | undefined,
          options: compSpec.options,
          variant: compSpec.variant as Component['props']['variant'],
          fontSize: compSpec.fontSize as Component['props']['fontSize'],
          multiline: compSpec.multiline,
          rows: compSpec.rows,
        };
        if (compSpec.validation) {
          component.validation = compSpec.validation;
        }
        card.components.push(component);
      }
    }

    cards.push(card);
  }

  // Second pass: resolve cross-references and add actions
  const allCards = [...existingCards, ...cards];
  const cardByTitle = new Map(allCards.map((c) => [c.title.toLowerCase(), c]));

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const card = cards[i];

    if (spec.actions) {
      for (const actionSpec of spec.actions) {
        const action: Action = {
          id: crypto.randomUUID(),
          trigger: actionSpec.trigger,
          condition: actionSpec.condition,
          effects: [],
        };

        // Resolve component reference
        if (actionSpec.componentName) {
          const comp = card.components.find(
            (c) => c.name === actionSpec.componentName
          );
          if (comp) action.componentId = comp.id;
        }

        // Process effects
        for (const effectSpec of actionSpec.effects) {
          const effect = resolveEffect(effectSpec, cardByTitle);
          if (effect) action.effects.push(effect);
        }

        card.actions.push(action);
      }
    }
  }

  return cards;
}

function resolveEffect(
  effectSpec: {
    type: string;
    cardTitle?: string;
    target?: string;
    expression?: string;
    formula?: string;
    output?: string;
    message?: string;
    dataSourceId?: string;
  },
  cardByTitle: Map<string, Card>
): ActionEffect | null {
  switch (effectSpec.type) {
    case 'navigate': {
      const targetCard = effectSpec.cardTitle
        ? cardByTitle.get(effectSpec.cardTitle.toLowerCase())
        : null;
      if (!targetCard) return null;
      return { type: 'navigate', cardId: targetCard.id };
    }
    case 'setValue':
      return {
        type: 'setValue',
        target: effectSpec.target || '',
        expression: effectSpec.expression || '',
      };
    case 'showMessage':
      return { type: 'showMessage', message: effectSpec.message || '' };
    case 'submitData':
      return { type: 'submitData', dataSourceId: effectSpec.dataSourceId || '' };
    case 'runFormula':
      return {
        type: 'runFormula',
        formula: effectSpec.formula || '',
        output: effectSpec.output || '',
      };
    case 'setVisibility':
      return {
        type: 'setVisibility',
        target: effectSpec.target || '',
        expression: effectSpec.expression || '',
      };
    case 'validate':
      return { type: 'validate' };
    default:
      return null;
  }
}

/**
 * Run the lint_and_repair_logic tool.
 */
export function runLintAndRepair(stack: Stack): {
  issues: ReturnType<typeof lintStack>;
  explanation: string;
} {
  const issues = lintStack(stack);

  let explanation = '';
  if (issues.length === 0) {
    explanation = 'No issues found. Your stack logic looks good!';
  } else {
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    explanation = `Found ${errors.length} error(s) and ${warnings.length} warning(s):\n`;
    for (const issue of issues) {
      const card = stack.cards.find((c) => c.id === issue.cardId);
      explanation += `\n[${issue.severity.toUpperCase()}] Card "${card?.title || issue.cardId}": ${issue.message}`;
    }
  }

  return { issues, explanation };
}

// ── AI System Prompt ─────────────────────────────────────────────

export function buildAISystemPrompt(stack: Stack | null): string {
  const stackInfo = stack
    ? `\nCurrent stack: "${stack.name}" with ${stack.cards.length} card(s).\nExisting cards: ${stack.cards.map((c) => `"${c.title}"`).join(', ') || 'none'}\nData sources: ${stack.dataSources.map((d) => `"${d.name}"`).join(', ') || 'none'}`
    : '\nNo stack loaded yet.';

  return `You are the CardStack AI Copilot. You help users build interactive apps using cards, fields, buttons, and logic.

You have access to these tools:
- create_cards: Create new cards with components and actions
- add_components: Add components to existing cards
- generate_rules: Create if/then rules for cards
- lint_and_repair_logic: Check for logic errors

Component types: text, input, number, dropdown, checkbox, button, image, table
Event triggers: onOpen, onClick, onChange, onSubmit
Action effects: navigate, setValue, showMessage, submitData, runFormula, setVisibility, validate

Expression language supports: arithmetic (+, -, *, /), comparisons (==, !=, >, <, >=, <=),
logic (&&, ||, !), string concatenation (+), field references (fields.name),
and built-in functions (if, len, upper, lower, trim, contains, sum, avg, count, min, max, round, today, now).
${stackInfo}

Guidelines:
- Keep component names short and camelCase (e.g., "firstName", "totalAmount")
- Use clear labels for all user-facing components
- Add validation for required fields
- Use navigate effects to connect cards in a workflow
- When creating multi-step workflows, connect cards with button navigation
- Always respond with a brief explanation of what you created/modified`;
}
