/**
 * CardStack AI - Core Data Model
 *
 * Stack = app
 * Card = screen/view
 * Component = UI element on a card
 * Action = event-driven behavior
 * DataSource = local table / CSV link
 */

// ── Component Types ──────────────────────────────────────────────

export type ComponentType =
  | 'text'
  | 'input'
  | 'number'
  | 'dropdown'
  | 'checkbox'
  | 'button'
  | 'image'
  | 'table';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: string | number;
  message: string;
}

export interface ComponentBinding {
  field: string;
  dataSource?: string;
}

export interface ComponentProps {
  label?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  src?: string;
  alt?: string;
  columns?: Array<{ key: string; label: string; type?: string }>;
  dataSourceId?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
  disabled?: boolean;
  hidden?: boolean;
  multiline?: boolean;
  rows?: number;
}

export interface Component {
  id: string;
  type: ComponentType;
  name: string;
  props: ComponentProps;
  bindings?: ComponentBinding;
  validation?: ValidationRule[];
  style?: Record<string, string>;
  order: number;
}

// ── Actions & Events ─────────────────────────────────────────────

export type EventTrigger = 'onOpen' | 'onClick' | 'onChange' | 'onSubmit';

export type ActionEffect =
  | { type: 'navigate'; cardId: string }
  | { type: 'setValue'; target: string; expression: string }
  | { type: 'showMessage'; message: string }
  | { type: 'submitData'; dataSourceId: string }
  | { type: 'runFormula'; formula: string; output: string }
  | { type: 'setVisibility'; target: string; expression: string }
  | { type: 'validate'; componentIds?: string[] }
  | { type: 'exportCsv'; dataSourceId: string }
  | { type: 'importCsv'; dataSourceId: string };

export interface Action {
  id: string;
  trigger: EventTrigger;
  componentId?: string;
  condition?: string; // expression that evaluates to boolean
  effects: ActionEffect[];
}

// ── Rules ────────────────────────────────────────────────────────

export interface Rule {
  id: string;
  name: string;
  description?: string;
  condition: string; // expression: e.g., "fields.amount > 1000"
  thenEffects: ActionEffect[];
  elseEffects?: ActionEffect[];
  active: boolean;
}

// ── Card ─────────────────────────────────────────────────────────

export interface Card {
  id: string;
  title: string;
  description?: string;
  components: Component[];
  actions: Action[];
  rules: Rule[];
  order: number;
  background?: string;
}

// ── Data Source ──────────────────────────────────────────────────

export interface DataColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  required?: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  columns: DataColumn[];
  records: Record<string, unknown>[];
}

// ── Stack (Top-Level App) ────────────────────────────────────────

export interface StackSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontFamily: string;
  showNavigation: boolean;
  allowExport: boolean;
}

export interface Stack {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  cards: Card[];
  dataSources: DataSource[];
  settings: StackSettings;
  variables: Record<string, unknown>;
}

// ── Template Metadata ────────────────────────────────────────────

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
}

export interface StackTemplate extends TemplateMetadata {
  stack: Omit<Stack, 'id' | 'createdAt' | 'updatedAt'>;
}

// ── AI Types ─────────────────────────────────────────────────────

export interface AICopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIToolCall {
  name: 'create_cards' | 'add_components' | 'generate_rules' | 'lint_and_repair_logic';
  arguments: Record<string, unknown>;
}

export interface AIGenerationResult {
  cards?: Card[];
  components?: Component[];
  rules?: Rule[];
  actions?: Action[];
  explanation?: string;
  errors?: string[];
}

// ── Runtime State ────────────────────────────────────────────────

export interface RuntimeState {
  currentCardId: string;
  fields: Record<string, unknown>;
  errors: Record<string, string>;
  messages: Array<{ type: 'info' | 'success' | 'warning' | 'error'; text: string }>;
  dataRecords: Record<string, Record<string, unknown>[]>;
}

// ── Validation helpers ───────────────────────────────────────────

export function createDefaultStack(name: string): Stack {
  return {
    id: crypto.randomUUID(),
    name,
    description: '',
    version: '0.1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cards: [],
    dataSources: [],
    settings: {
      theme: 'light',
      primaryColor: '#6366f1',
      fontFamily: 'Inter, system-ui, sans-serif',
      showNavigation: true,
      allowExport: true,
    },
    variables: {},
  };
}

export function createDefaultCard(title: string, order: number): Card {
  return {
    id: crypto.randomUUID(),
    title,
    components: [],
    actions: [],
    rules: [],
    order,
  };
}

export function createDefaultComponent(
  type: ComponentType,
  name: string,
  order: number
): Component {
  return {
    id: crypto.randomUUID(),
    type,
    name,
    props: {},
    order,
  };
}
