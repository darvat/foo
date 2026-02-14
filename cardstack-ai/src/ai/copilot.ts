/**
 * CardStack AI - Copilot Integration
 *
 * Handles communication with the LLM API and processes tool calls.
 */

import type { Card, Stack } from '../types/schema';
import { createDefaultComponent } from '../types/schema';
import { AI_TOOL_DEFINITIONS, buildAISystemPrompt, processCreateCards, runLintAndRepair } from './tools';

export interface CopilotConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface CopilotResult {
  message: string;
  cards?: Card[];
  components?: Array<{ cardId: string; components: Card['components'] }>;
  rules?: Array<{ cardId: string; rules: Card['rules'] }>;
}

const DEFAULT_CONFIG: CopilotConfig = {
  apiKey: '',
  apiUrl: 'https://api.anthropic.com/v1/messages',
  model: 'claude-sonnet-4-20250514',
};

let config: CopilotConfig = { ...DEFAULT_CONFIG };

export function configureCopilot(newConfig: Partial<CopilotConfig>): void {
  config = { ...config, ...newConfig };
}

export function getCopilotConfig(): CopilotConfig {
  return { ...config };
}

/**
 * Process a user prompt through the AI copilot.
 *
 * In the MVP, this handles tool calls locally if no API key is configured,
 * using template-based generation. When an API key is available, it calls
 * the LLM for intelligent generation.
 */
export async function processPrompt(
  prompt: string,
  stack: Stack | null,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<CopilotResult> {
  // If API key is configured, use real LLM
  if (config.apiKey) {
    return processWithLLM(prompt, stack, conversationHistory);
  }

  // Otherwise use local template-based generation
  return processLocally(prompt, stack);
}

/**
 * Local template-based generation (no API key required).
 */
async function processLocally(
  prompt: string,
  stack: Stack | null
): Promise<CopilotResult> {
  const lower = prompt.toLowerCase();

  // Lint and repair
  if (lower.includes('lint') || lower.includes('fix') || lower.includes('check') || lower.includes('repair')) {
    if (!stack) {
      return { message: 'No stack loaded. Create a stack first.' };
    }
    const { explanation } = runLintAndRepair(stack);
    return { message: explanation };
  }

  // Explain
  if (lower.includes('explain')) {
    if (!stack) {
      return { message: 'No stack loaded. Create a stack first.' };
    }
    const cardCount = stack.cards.length;
    const compCount = stack.cards.reduce((s, c) => s + c.components.length, 0);
    const ruleCount = stack.cards.reduce((s, c) => s + c.rules.length, 0);
    const actionCount = stack.cards.reduce((s, c) => s + c.actions.length, 0);
    return {
      message: `Stack "${stack.name}" has ${cardCount} card(s), ${compCount} component(s), ${ruleCount} rule(s), and ${actionCount} action(s).\n\nCards:\n${stack.cards.map((c, i) => `${i + 1}. "${c.title}" - ${c.components.length} components, ${c.actions.length} actions`).join('\n')}`,
    };
  }

  // Generate cards based on prompt analysis
  const cards = generateFromPrompt(prompt, stack?.cards || []);
  return {
    message: `Created ${cards.length} card(s) based on your description. You can edit them in the visual editor or ask me to modify them.`,
    cards,
  };
}

/**
 * Smart local generation based on prompt analysis.
 */
function generateFromPrompt(prompt: string, existingCards: Card[]): Card[] {
  const lower = prompt.toLowerCase();

  // Detect intent and generate appropriate cards
  const specs = analyzePromptAndGenerateSpecs(lower, prompt);
  return processCreateCards(specs, existingCards);
}

function analyzePromptAndGenerateSpecs(lower: string, _original: string) {
  // Form / intake patterns
  if (lower.includes('form') || lower.includes('intake') || lower.includes('onboarding') || lower.includes('registration') || lower.includes('sign up') || lower.includes('signup')) {
    return generateFormSpecs(lower);
  }

  // Approval / review patterns
  if (lower.includes('approval') || lower.includes('review') || lower.includes('approve')) {
    return generateApprovalSpecs(lower);
  }

  // Calculator / estimator patterns
  if (lower.includes('calculator') || lower.includes('calculate') || lower.includes('estimat') || lower.includes('cost') || lower.includes('price') || lower.includes('quote')) {
    return generateCalculatorSpecs(lower);
  }

  // Tracker / CRM patterns
  if (lower.includes('track') || lower.includes('crm') || lower.includes('contact') || lower.includes('customer') || lower.includes('lead')) {
    return generateTrackerSpecs(lower);
  }

  // Checklist / SOP patterns
  if (lower.includes('checklist') || lower.includes('sop') || lower.includes('procedure') || lower.includes('steps') || lower.includes('process')) {
    return generateChecklistSpecs(lower);
  }

  // Survey / quiz patterns
  if (lower.includes('survey') || lower.includes('quiz') || lower.includes('questionnaire') || lower.includes('feedback')) {
    return generateSurveySpecs(lower);
  }

  // Default: create a simple multi-card workflow
  return generateDefaultSpecs(lower);
}

function generateFormSpecs(_lower: string) {
  return [
    {
      title: 'Information',
      description: 'Collect user information',
      components: [
        { type: 'text' as const, name: 'formTitle', label: 'Submission Form', fontSize: 'xl' as const },
        { type: 'input' as const, name: 'fullName', label: 'Full Name', placeholder: 'Enter your full name', validation: [{ type: 'required' as const, message: 'Name is required' }] },
        { type: 'input' as const, name: 'email', label: 'Email Address', placeholder: 'name@example.com', validation: [{ type: 'required' as const, message: 'Email is required' }, { type: 'pattern' as const, value: '^[^@]+@[^@]+\\.[^@]+$', message: 'Invalid email format' }] },
        { type: 'input' as const, name: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000' },
        { type: 'dropdown' as const, name: 'department', label: 'Department', options: [{ label: 'Sales', value: 'sales' }, { label: 'Engineering', value: 'engineering' }, { label: 'Marketing', value: 'marketing' }, { label: 'Operations', value: 'operations' }, { label: 'Other', value: 'other' }] },
        { type: 'input' as const, name: 'notes', label: 'Additional Notes', placeholder: 'Any other details...', multiline: true, rows: 3 },
        { type: 'button' as const, name: 'submitBtn', label: 'Submit', variant: 'primary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'submitBtn', effects: [{ type: 'validate' }, { type: 'navigate', cardTitle: 'Confirmation' }] },
      ],
    },
    {
      title: 'Confirmation',
      description: 'Submission confirmed',
      components: [
        { type: 'text' as const, name: 'confirmTitle', label: 'Submission Received', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'confirmMessage', label: 'Thank you! Your information has been submitted successfully.' },
        { type: 'button' as const, name: 'backBtn', label: 'Submit Another', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'backBtn', effects: [{ type: 'navigate', cardTitle: 'Information' }] },
      ],
    },
  ];
}

function generateApprovalSpecs(_lower: string) {
  return [
    {
      title: 'Submit Request',
      description: 'Submit an item for approval',
      components: [
        { type: 'text' as const, name: 'title', label: 'Approval Request', fontSize: 'xl' as const },
        { type: 'input' as const, name: 'requestTitle', label: 'Request Title', placeholder: 'Brief description', validation: [{ type: 'required' as const, message: 'Title is required' }] },
        { type: 'dropdown' as const, name: 'category', label: 'Category', options: [{ label: 'Purchase', value: 'purchase' }, { label: 'Expense', value: 'expense' }, { label: 'Travel', value: 'travel' }, { label: 'Other', value: 'other' }] },
        { type: 'number' as const, name: 'amount', label: 'Amount (CHF)', placeholder: '0.00', validation: [{ type: 'required' as const, message: 'Amount is required' }, { type: 'min' as const, value: 0, message: 'Amount must be positive' }] },
        { type: 'input' as const, name: 'justification', label: 'Justification', placeholder: 'Why is this needed?', multiline: true, rows: 3 },
        { type: 'button' as const, name: 'submitBtn', label: 'Submit for Approval', variant: 'primary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'submitBtn', effects: [{ type: 'validate' }, { type: 'navigate', cardTitle: 'Manager Review' }] },
      ],
    },
    {
      title: 'Manager Review',
      description: 'Review and approve/reject the request',
      components: [
        { type: 'text' as const, name: 'reviewTitle', label: 'Manager Review', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'reviewInfo', label: 'Review the details below and approve or reject.' },
        { type: 'input' as const, name: 'reviewNotes', label: 'Review Notes', placeholder: 'Add your comments...', multiline: true, rows: 3 },
        { type: 'button' as const, name: 'approveBtn', label: 'Approve', variant: 'primary' as const },
        { type: 'button' as const, name: 'rejectBtn', label: 'Reject', variant: 'danger' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'approveBtn', effects: [{ type: 'setValue', target: 'status', expression: '"approved"' }, { type: 'navigate', cardTitle: 'Final Status' }] },
        { trigger: 'onClick' as const, componentName: 'rejectBtn', effects: [{ type: 'setValue', target: 'status', expression: '"rejected"' }, { type: 'navigate', cardTitle: 'Final Status' }] },
      ],
    },
    {
      title: 'Final Status',
      description: 'Final approval status',
      components: [
        { type: 'text' as const, name: 'statusTitle', label: 'Request Status', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'statusMessage', label: 'Your request has been processed.' },
        { type: 'button' as const, name: 'newBtn', label: 'New Request', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'newBtn', effects: [{ type: 'navigate', cardTitle: 'Submit Request' }] },
      ],
    },
  ];
}

function generateCalculatorSpecs(_lower: string) {
  return [
    {
      title: 'Calculator',
      description: 'Enter values to calculate',
      components: [
        { type: 'text' as const, name: 'calcTitle', label: 'Cost Calculator', fontSize: 'xl' as const },
        { type: 'number' as const, name: 'quantity', label: 'Quantity', placeholder: '0', validation: [{ type: 'required' as const, message: 'Required' }, { type: 'min' as const, value: 1, message: 'Must be at least 1' }] },
        { type: 'number' as const, name: 'unitPrice', label: 'Unit Price (CHF)', placeholder: '0.00', validation: [{ type: 'required' as const, message: 'Required' }] },
        { type: 'number' as const, name: 'taxRate', label: 'Tax Rate (%)', placeholder: '7.7', defaultValue: 7.7 },
        { type: 'dropdown' as const, name: 'discount', label: 'Discount', options: [{ label: 'None', value: '0' }, { label: '5%', value: '5' }, { label: '10%', value: '10' }, { label: '15%', value: '15' }, { label: '20%', value: '20' }] },
        { type: 'button' as const, name: 'calculateBtn', label: 'Calculate Total', variant: 'primary' as const },
      ],
      actions: [
        {
          trigger: 'onClick' as const,
          componentName: 'calculateBtn',
          effects: [
            { type: 'runFormula', formula: 'fields.quantity * fields.unitPrice', output: 'subtotal' },
            { type: 'runFormula', formula: 'fields.subtotal * (1 - Number(fields.discount || 0) / 100)', output: 'afterDiscount' },
            { type: 'runFormula', formula: 'fields.afterDiscount * (1 + (fields.taxRate || 7.7) / 100)', output: 'total' },
            { type: 'navigate', cardTitle: 'Results' },
          ],
        },
      ],
    },
    {
      title: 'Results',
      description: 'Calculation results',
      components: [
        { type: 'text' as const, name: 'resultTitle', label: 'Calculation Results', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'subtotalLabel', label: 'Subtotal' },
        { type: 'text' as const, name: 'discountLabel', label: 'After Discount' },
        { type: 'text' as const, name: 'totalLabel', label: 'Total (incl. tax)' },
        { type: 'button' as const, name: 'recalcBtn', label: 'Recalculate', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'recalcBtn', effects: [{ type: 'navigate', cardTitle: 'Calculator' }] },
      ],
    },
  ];
}

function generateTrackerSpecs(_lower: string) {
  return [
    {
      title: 'Add Entry',
      description: 'Add a new tracked item',
      components: [
        { type: 'text' as const, name: 'trackerTitle', label: 'Tracker', fontSize: 'xl' as const },
        { type: 'input' as const, name: 'itemName', label: 'Name', placeholder: 'Enter name', validation: [{ type: 'required' as const, message: 'Name is required' }] },
        { type: 'input' as const, name: 'itemEmail', label: 'Email', placeholder: 'email@example.com' },
        { type: 'input' as const, name: 'itemPhone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
        { type: 'dropdown' as const, name: 'itemStatus', label: 'Status', options: [{ label: 'New', value: 'new' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Completed', value: 'completed' }, { label: 'On Hold', value: 'on_hold' }] },
        { type: 'input' as const, name: 'itemNotes', label: 'Notes', placeholder: 'Additional details...', multiline: true, rows: 2 },
        { type: 'button' as const, name: 'addBtn', label: 'Add Entry', variant: 'primary' as const },
        { type: 'button' as const, name: 'viewBtn', label: 'View All', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'addBtn', effects: [{ type: 'validate' }, { type: 'showMessage', message: 'Entry added successfully!' }] },
        { trigger: 'onClick' as const, componentName: 'viewBtn', effects: [{ type: 'navigate', cardTitle: 'All Entries' }] },
      ],
    },
    {
      title: 'All Entries',
      description: 'View all tracked items',
      components: [
        { type: 'text' as const, name: 'listTitle', label: 'All Entries', fontSize: 'xl' as const },
        { type: 'table' as const, name: 'entriesTable', label: 'Entries' },
        { type: 'button' as const, name: 'addNewBtn', label: 'Add New', variant: 'primary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'addNewBtn', effects: [{ type: 'navigate', cardTitle: 'Add Entry' }] },
      ],
    },
  ];
}

function generateChecklistSpecs(_lower: string) {
  return [
    {
      title: 'Checklist',
      description: 'Step-by-step checklist',
      components: [
        { type: 'text' as const, name: 'checklistTitle', label: 'Process Checklist', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'instructions', label: 'Complete all steps below in order.' },
        { type: 'checkbox' as const, name: 'step1', label: 'Step 1: Review requirements' },
        { type: 'checkbox' as const, name: 'step2', label: 'Step 2: Gather materials' },
        { type: 'checkbox' as const, name: 'step3', label: 'Step 3: Execute procedure' },
        { type: 'checkbox' as const, name: 'step4', label: 'Step 4: Verify results' },
        { type: 'checkbox' as const, name: 'step5', label: 'Step 5: Document completion' },
        { type: 'input' as const, name: 'completedBy', label: 'Completed By', placeholder: 'Your name' },
        { type: 'button' as const, name: 'completeBtn', label: 'Mark Complete', variant: 'primary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'completeBtn', effects: [{ type: 'navigate', cardTitle: 'Summary' }] },
      ],
    },
    {
      title: 'Summary',
      description: 'Completion summary',
      components: [
        { type: 'text' as const, name: 'summaryTitle', label: 'Checklist Complete', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'summaryMessage', label: 'All steps have been completed and documented.' },
        { type: 'button' as const, name: 'restartBtn', label: 'Start New Checklist', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'restartBtn', effects: [{ type: 'navigate', cardTitle: 'Checklist' }] },
      ],
    },
  ];
}

function generateSurveySpecs(_lower: string) {
  return [
    {
      title: 'Questions',
      description: 'Survey questions',
      components: [
        { type: 'text' as const, name: 'surveyTitle', label: 'Feedback Survey', fontSize: 'xl' as const },
        { type: 'dropdown' as const, name: 'rating', label: 'Overall Rating', options: [{ label: 'Excellent', value: '5' }, { label: 'Good', value: '4' }, { label: 'Average', value: '3' }, { label: 'Below Average', value: '2' }, { label: 'Poor', value: '1' }], validation: [{ type: 'required' as const, message: 'Please select a rating' }] },
        { type: 'input' as const, name: 'feedback', label: 'Your Feedback', placeholder: 'Tell us what you think...', multiline: true, rows: 4 },
        { type: 'checkbox' as const, name: 'followUp', label: 'I would like a follow-up response' },
        { type: 'button' as const, name: 'submitBtn', label: 'Submit Feedback', variant: 'primary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'submitBtn', effects: [{ type: 'validate' }, { type: 'navigate', cardTitle: 'Thank You' }] },
      ],
    },
    {
      title: 'Thank You',
      description: 'Survey submitted',
      components: [
        { type: 'text' as const, name: 'thankTitle', label: 'Thank You!', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'thankMessage', label: 'Your feedback has been recorded. We appreciate your time!' },
        { type: 'button' as const, name: 'anotherBtn', label: 'Submit Another Response', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'anotherBtn', effects: [{ type: 'navigate', cardTitle: 'Questions' }] },
      ],
    },
  ];
}

function generateDefaultSpecs(_lower: string) {
  return [
    {
      title: 'Home',
      description: 'Main screen',
      components: [
        { type: 'text' as const, name: 'welcomeTitle', label: 'Welcome', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'description', label: 'This is your new app. Start by adding components and logic.' },
        { type: 'button' as const, name: 'getStartedBtn', label: 'Get Started', variant: 'primary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'getStartedBtn', effects: [{ type: 'navigate', cardTitle: 'Step 1' }] },
      ],
    },
    {
      title: 'Step 1',
      description: 'First step',
      components: [
        { type: 'text' as const, name: 'step1Title', label: 'Step 1', fontSize: 'xl' as const },
        { type: 'input' as const, name: 'userInput', label: 'Your Input', placeholder: 'Type something...' },
        { type: 'button' as const, name: 'nextBtn', label: 'Next', variant: 'primary' as const },
        { type: 'button' as const, name: 'backBtn', label: 'Back', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'nextBtn', effects: [{ type: 'navigate', cardTitle: 'Complete' }] },
        { trigger: 'onClick' as const, componentName: 'backBtn', effects: [{ type: 'navigate', cardTitle: 'Home' }] },
      ],
    },
    {
      title: 'Complete',
      description: 'Completion screen',
      components: [
        { type: 'text' as const, name: 'completeTitle', label: 'All Done!', fontSize: 'xl' as const },
        { type: 'text' as const, name: 'completeMessage', label: 'You have completed the workflow.' },
        { type: 'button' as const, name: 'restartBtn', label: 'Start Over', variant: 'secondary' as const },
      ],
      actions: [
        { trigger: 'onClick' as const, componentName: 'restartBtn', effects: [{ type: 'navigate', cardTitle: 'Home' }] },
      ],
    },
  ];
}

/**
 * Process with real LLM API.
 */
async function processWithLLM(
  prompt: string,
  stack: Stack | null,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<CopilotResult> {
  const messages: LLMMessage[] = [
    { role: 'system', content: buildAISystemPrompt(stack) },
    ...conversationHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: prompt },
  ];

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: messages[0].content,
        messages: messages.slice(1).map((m) => ({ role: m.role, content: m.content })),
        tools: AI_TOOL_DEFINITIONS.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return processLLMResponse(data, stack);
  } catch (error) {
    // Fallback to local generation
    console.warn('LLM API call failed, using local generation:', error);
    return processLocally(prompt, stack);
  }
}

function processLLMResponse(
  data: { content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }> },
  stack: Stack | null
): CopilotResult {
  const result: CopilotResult = { message: '' };
  const existingCards = stack?.cards || [];

  for (const block of data.content) {
    if (block.type === 'text' && block.text) {
      result.message += block.text;
    }

    if (block.type === 'tool_use' && block.name && block.input) {
      switch (block.name) {
        case 'create_cards': {
          const specs = (block.input as { cards: CardSpec[] }).cards || [];
          result.cards = processCreateCards(specs as CardSpec[], existingCards);
          break;
        }
        case 'add_components': {
          const cardTitle = (block.input as { cardTitle: string }).cardTitle;
          const card = existingCards.find((c) => c.title.toLowerCase() === cardTitle.toLowerCase());
          if (card) {
            const compSpecs = (block.input as { components: Array<{ type: ComponentType; name: string }> }).components || [];
            const components = compSpecs.map((spec, i) => {
              const comp = createDefaultComponent(spec.type as ComponentType, spec.name, card.components.length + i);
              Object.assign(comp.props, spec);
              return comp;
            });
            result.components = [{ cardId: card.id, components }];
          }
          break;
        }
        case 'generate_rules': {
          const cardTitle = (block.input as { cardTitle: string }).cardTitle;
          const card = existingCards.find((c) => c.title.toLowerCase() === cardTitle.toLowerCase());
          if (card) {
            const ruleSpecs = (block.input as { rules: Array<{ name: string; condition: string; thenEffects: ActionEffect[]; elseEffects?: ActionEffect[] }> }).rules || [];
            const rules = ruleSpecs.map((spec) => ({
              id: crypto.randomUUID(),
              name: spec.name,
              condition: spec.condition,
              thenEffects: spec.thenEffects,
              elseEffects: spec.elseEffects,
              active: true,
            }));
            result.rules = [{ cardId: card.id, rules }];
          }
          break;
        }
        case 'lint_and_repair_logic': {
          if (stack) {
            const { explanation } = runLintAndRepair(stack);
            result.message += '\n\n' + explanation;
          }
          break;
        }
      }
    }
  }

  return result;
}

type CardSpec = Parameters<typeof processCreateCards>[0][0];
type ComponentType = Card['components'][0]['type'];
type ActionEffect = Card['actions'][0]['effects'][0];
