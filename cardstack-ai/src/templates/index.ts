/**
 * CardStack AI - Starter Templates
 *
 * 5 built-in templates for common business workflows.
 */

import type { StackTemplate } from '../types/schema';
import { createDefaultCard, createDefaultComponent } from '../types/schema';

function makeCard(title: string, order: number, components: Parameters<typeof createDefaultComponent extends (...args: infer A) => unknown ? never : never>[], description?: string) {
  const card = createDefaultCard(title, order);
  if (description) card.description = description;
  return card;
}

// ── Template 1: Intake Form ─────────────────────────────────────

const intakeFormTemplate: StackTemplate = {
  id: 'tpl-intake-form',
  name: 'Intake Form',
  description: 'Collect and validate information from users with a multi-step intake process.',
  category: 'Forms',
  icon: 'clipboard-list',
  tags: ['form', 'intake', 'data collection', 'onboarding'],
  stack: {
    name: 'Intake Form',
    description: 'Multi-step intake form with validation',
    version: '1.0.0',
    cards: [
      {
        ...createDefaultCard('Personal Information', 0),
        description: 'Collect personal details',
        components: [
          { ...createDefaultComponent('text', 'header', 0), props: { label: 'Personal Information', fontSize: 'xl' } },
          { ...createDefaultComponent('input', 'firstName', 1), props: { label: 'First Name', placeholder: 'Enter first name' }, validation: [{ type: 'required', message: 'First name is required' }] },
          { ...createDefaultComponent('input', 'lastName', 2), props: { label: 'Last Name', placeholder: 'Enter last name' }, validation: [{ type: 'required', message: 'Last name is required' }] },
          { ...createDefaultComponent('input', 'email', 3), props: { label: 'Email', placeholder: 'name@company.com' }, validation: [{ type: 'required', message: 'Email is required' }, { type: 'pattern', value: '^[^@]+@[^@]+\\.[^@]+$', message: 'Invalid email' }] },
          { ...createDefaultComponent('input', 'phone', 4), props: { label: 'Phone', placeholder: '+1 (555) 000-0000' } },
          { ...createDefaultComponent('button', 'nextBtn', 5), props: { label: 'Next Step', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Details', 1),
        description: 'Additional details',
        components: [
          { ...createDefaultComponent('text', 'detailsHeader', 0), props: { label: 'Additional Details', fontSize: 'xl' } },
          { ...createDefaultComponent('dropdown', 'source', 1), props: { label: 'How did you hear about us?', options: [{ label: 'Website', value: 'website' }, { label: 'Referral', value: 'referral' }, { label: 'Social Media', value: 'social' }, { label: 'Other', value: 'other' }] } },
          { ...createDefaultComponent('input', 'message', 2), props: { label: 'Message', placeholder: 'Tell us about your needs...', multiline: true, rows: 4 } },
          { ...createDefaultComponent('checkbox', 'consent', 3), props: { label: 'I agree to the terms and conditions' }, validation: [{ type: 'required', message: 'You must agree to continue' }] },
          { ...createDefaultComponent('button', 'backBtn', 4), props: { label: 'Back', variant: 'secondary' } },
          { ...createDefaultComponent('button', 'submitBtn', 5), props: { label: 'Submit', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Thank You', 2),
        description: 'Submission confirmed',
        components: [
          { ...createDefaultComponent('text', 'thankHeader', 0), props: { label: 'Thank You!', fontSize: 'xl' } },
          { ...createDefaultComponent('text', 'thankMessage', 1), props: { label: 'Your information has been submitted successfully. We will be in touch shortly.' } },
          { ...createDefaultComponent('button', 'newSubmitBtn', 2), props: { label: 'Submit Another', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
    ],
    dataSources: [],
    settings: {
      theme: 'light',
      primaryColor: '#6366f1',
      fontFamily: 'Inter, system-ui, sans-serif',
      showNavigation: true,
      allowExport: true,
    },
    variables: {},
  },
};

// ── Template 2: Approval Workflow ────────────────────────────────

const approvalWorkflowTemplate: StackTemplate = {
  id: 'tpl-approval-workflow',
  name: 'Approval Workflow',
  description: 'Submit requests for review and approval with configurable thresholds.',
  category: 'Workflows',
  icon: 'check-circle',
  tags: ['approval', 'workflow', 'review', 'management'],
  stack: {
    name: 'Approval Workflow',
    description: 'Request submission and approval process',
    version: '1.0.0',
    cards: [
      {
        ...createDefaultCard('Submit Request', 0),
        description: 'Submit a new request',
        components: [
          { ...createDefaultComponent('text', 'submitHeader', 0), props: { label: 'New Request', fontSize: 'xl' } },
          { ...createDefaultComponent('input', 'requestor', 1), props: { label: 'Requestor Name', placeholder: 'Your name' }, validation: [{ type: 'required', message: 'Required' }] },
          { ...createDefaultComponent('dropdown', 'requestType', 2), props: { label: 'Request Type', options: [{ label: 'Purchase Order', value: 'purchase' }, { label: 'Expense Reimbursement', value: 'expense' }, { label: 'Budget Allocation', value: 'budget' }, { label: 'Travel Request', value: 'travel' }] } },
          { ...createDefaultComponent('input', 'requestTitle', 3), props: { label: 'Description', placeholder: 'Brief description of request' }, validation: [{ type: 'required', message: 'Required' }] },
          { ...createDefaultComponent('number', 'amount', 4), props: { label: 'Amount (CHF)', placeholder: '0.00' }, validation: [{ type: 'required', message: 'Required' }, { type: 'min', value: 0, message: 'Must be positive' }] },
          { ...createDefaultComponent('input', 'justification', 5), props: { label: 'Business Justification', placeholder: 'Why is this needed?', multiline: true, rows: 3 }, validation: [{ type: 'required', message: 'Required' }] },
          { ...createDefaultComponent('button', 'submitBtn', 6), props: { label: 'Submit for Approval', variant: 'primary' } },
        ],
        actions: [],
        rules: [
          {
            id: crypto.randomUUID(),
            name: 'Auto-approve small amounts',
            description: 'Amounts under 1000 CHF are auto-approved',
            condition: 'fields.amount <= 1000',
            thenEffects: [
              { type: 'setValue', target: 'status', expression: '"auto-approved"' },
              { type: 'showMessage', message: 'Request auto-approved (under threshold)' },
            ],
            active: true,
          },
        ],
      },
      {
        ...createDefaultCard('Manager Review', 1),
        description: 'Manager reviews the request',
        components: [
          { ...createDefaultComponent('text', 'reviewHeader', 0), props: { label: 'Manager Review', fontSize: 'xl' } },
          { ...createDefaultComponent('text', 'reviewInstructions', 1), props: { label: 'Review the request details and make a decision.' } },
          { ...createDefaultComponent('input', 'reviewerNotes', 2), props: { label: 'Review Notes', placeholder: 'Add your review comments...', multiline: true, rows: 3 } },
          { ...createDefaultComponent('button', 'approveBtn', 3), props: { label: 'Approve', variant: 'primary' } },
          { ...createDefaultComponent('button', 'rejectBtn', 4), props: { label: 'Reject', variant: 'danger' } },
          { ...createDefaultComponent('button', 'moreInfoBtn', 5), props: { label: 'Request More Info', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Decision', 2),
        description: 'Final decision status',
        components: [
          { ...createDefaultComponent('text', 'decisionHeader', 0), props: { label: 'Request Decision', fontSize: 'xl' } },
          { ...createDefaultComponent('text', 'decisionMessage', 1), props: { label: 'Your request has been processed.' } },
          { ...createDefaultComponent('text', 'auditNote', 2), props: { label: 'Decision recorded for audit trail.', fontSize: 'sm' } },
          { ...createDefaultComponent('button', 'newRequestBtn', 3), props: { label: 'New Request', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
    ],
    dataSources: [],
    settings: {
      theme: 'light',
      primaryColor: '#059669',
      fontFamily: 'Inter, system-ui, sans-serif',
      showNavigation: true,
      allowExport: true,
    },
    variables: {},
  },
};

// ── Template 3: Cost Calculator ──────────────────────────────────

const costCalculatorTemplate: StackTemplate = {
  id: 'tpl-cost-calculator',
  name: 'Cost Calculator',
  description: 'Calculate costs with quantities, discounts, and taxes.',
  category: 'Tools',
  icon: 'calculator',
  tags: ['calculator', 'cost', 'pricing', 'finance'],
  stack: {
    name: 'Cost Calculator',
    description: 'Multi-item cost calculator with tax and discount',
    version: '1.0.0',
    cards: [
      {
        ...createDefaultCard('Input', 0),
        description: 'Enter calculation parameters',
        components: [
          { ...createDefaultComponent('text', 'calcHeader', 0), props: { label: 'Cost Calculator', fontSize: 'xl' } },
          { ...createDefaultComponent('input', 'projectName', 1), props: { label: 'Project Name', placeholder: 'Enter project name' } },
          { ...createDefaultComponent('number', 'hoursEstimate', 2), props: { label: 'Estimated Hours', placeholder: '0' }, validation: [{ type: 'required', message: 'Required' }, { type: 'min', value: 0, message: 'Must be positive' }] },
          { ...createDefaultComponent('number', 'hourlyRate', 3), props: { label: 'Hourly Rate (CHF)', placeholder: '150' }, validation: [{ type: 'required', message: 'Required' }] },
          { ...createDefaultComponent('number', 'materialsCost', 4), props: { label: 'Materials Cost (CHF)', placeholder: '0.00' } },
          { ...createDefaultComponent('dropdown', 'discountTier', 5), props: { label: 'Client Discount', options: [{ label: 'None (0%)', value: '0' }, { label: 'Standard (5%)', value: '5' }, { label: 'Preferred (10%)', value: '10' }, { label: 'VIP (15%)', value: '15' }] } },
          { ...createDefaultComponent('number', 'taxRate', 6), props: { label: 'VAT Rate (%)', placeholder: '7.7', defaultValue: 7.7 } },
          { ...createDefaultComponent('button', 'calculateBtn', 7), props: { label: 'Calculate', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Results', 1),
        description: 'View calculation results',
        components: [
          { ...createDefaultComponent('text', 'resultHeader', 0), props: { label: 'Cost Breakdown', fontSize: 'xl' } },
          { ...createDefaultComponent('text', 'laborLine', 1), props: { label: 'Labor Cost' } },
          { ...createDefaultComponent('text', 'materialsLine', 2), props: { label: 'Materials' } },
          { ...createDefaultComponent('text', 'subtotalLine', 3), props: { label: 'Subtotal' } },
          { ...createDefaultComponent('text', 'discountLine', 4), props: { label: 'Discount' } },
          { ...createDefaultComponent('text', 'taxLine', 5), props: { label: 'VAT' } },
          { ...createDefaultComponent('text', 'totalLine', 6), props: { label: 'Total', fontSize: 'lg' } },
          { ...createDefaultComponent('button', 'recalcBtn', 7), props: { label: 'Adjust Values', variant: 'secondary' } },
          { ...createDefaultComponent('button', 'exportBtn', 8), props: { label: 'Export Quote', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
    ],
    dataSources: [],
    settings: {
      theme: 'light',
      primaryColor: '#d97706',
      fontFamily: 'Inter, system-ui, sans-serif',
      showNavigation: true,
      allowExport: true,
    },
    variables: {},
  },
};

// ── Template 4: CRM-Lite Tracker ─────────────────────────────────

const crmTrackerTemplate: StackTemplate = {
  id: 'tpl-crm-tracker',
  name: 'CRM-Lite Tracker',
  description: 'Track contacts, leads, and interactions with a simple CRM.',
  category: 'Business',
  icon: 'users',
  tags: ['crm', 'contacts', 'leads', 'sales', 'tracking'],
  stack: {
    name: 'CRM-Lite Tracker',
    description: 'Simple contact and lead tracking',
    version: '1.0.0',
    cards: [
      {
        ...createDefaultCard('Dashboard', 0),
        description: 'Overview of contacts and activity',
        components: [
          { ...createDefaultComponent('text', 'dashHeader', 0), props: { label: 'CRM Dashboard', fontSize: 'xl' } },
          { ...createDefaultComponent('text', 'dashSummary', 1), props: { label: 'Manage your contacts and track interactions.' } },
          { ...createDefaultComponent('button', 'addContactBtn', 2), props: { label: 'Add Contact', variant: 'primary' } },
          { ...createDefaultComponent('button', 'viewAllBtn', 3), props: { label: 'View All Contacts', variant: 'secondary' } },
          { ...createDefaultComponent('button', 'addInteractionBtn', 4), props: { label: 'Log Interaction', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Add Contact', 1),
        description: 'Add a new contact',
        components: [
          { ...createDefaultComponent('text', 'addHeader', 0), props: { label: 'New Contact', fontSize: 'xl' } },
          { ...createDefaultComponent('input', 'contactName', 1), props: { label: 'Full Name', placeholder: 'First Last' }, validation: [{ type: 'required', message: 'Name is required' }] },
          { ...createDefaultComponent('input', 'contactEmail', 2), props: { label: 'Email', placeholder: 'email@company.com' } },
          { ...createDefaultComponent('input', 'contactPhone', 3), props: { label: 'Phone', placeholder: '+1 (555) 000-0000' } },
          { ...createDefaultComponent('input', 'contactCompany', 4), props: { label: 'Company', placeholder: 'Company name' } },
          { ...createDefaultComponent('dropdown', 'contactStage', 5), props: { label: 'Stage', options: [{ label: 'Lead', value: 'lead' }, { label: 'Prospect', value: 'prospect' }, { label: 'Customer', value: 'customer' }, { label: 'Churned', value: 'churned' }] } },
          { ...createDefaultComponent('dropdown', 'contactPriority', 6), props: { label: 'Priority', options: [{ label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }] } },
          { ...createDefaultComponent('input', 'contactNotes', 7), props: { label: 'Notes', placeholder: 'Additional notes...', multiline: true, rows: 2 } },
          { ...createDefaultComponent('button', 'saveContactBtn', 8), props: { label: 'Save Contact', variant: 'primary' } },
          { ...createDefaultComponent('button', 'cancelBtn', 9), props: { label: 'Cancel', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Contact List', 2),
        description: 'View all contacts',
        components: [
          { ...createDefaultComponent('text', 'listHeader', 0), props: { label: 'All Contacts', fontSize: 'xl' } },
          { ...createDefaultComponent('table', 'contactsTable', 1), props: { label: 'Contacts', columns: [{ key: 'name', label: 'Name' }, { key: 'company', label: 'Company' }, { key: 'stage', label: 'Stage' }, { key: 'priority', label: 'Priority' }] } },
          { ...createDefaultComponent('button', 'backToDashBtn', 2), props: { label: 'Back to Dashboard', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Log Interaction', 3),
        description: 'Record a new interaction',
        components: [
          { ...createDefaultComponent('text', 'interactionHeader', 0), props: { label: 'Log Interaction', fontSize: 'xl' } },
          { ...createDefaultComponent('input', 'interactionContact', 1), props: { label: 'Contact Name', placeholder: 'Search contact...' } },
          { ...createDefaultComponent('dropdown', 'interactionType', 2), props: { label: 'Type', options: [{ label: 'Phone Call', value: 'call' }, { label: 'Email', value: 'email' }, { label: 'Meeting', value: 'meeting' }, { label: 'Note', value: 'note' }] } },
          { ...createDefaultComponent('input', 'interactionSummary', 3), props: { label: 'Summary', placeholder: 'What happened?', multiline: true, rows: 3 } },
          { ...createDefaultComponent('dropdown', 'interactionOutcome', 4), props: { label: 'Outcome', options: [{ label: 'Positive', value: 'positive' }, { label: 'Neutral', value: 'neutral' }, { label: 'Negative', value: 'negative' }, { label: 'Follow-up Needed', value: 'followup' }] } },
          { ...createDefaultComponent('button', 'saveInteractionBtn', 5), props: { label: 'Save', variant: 'primary' } },
          { ...createDefaultComponent('button', 'cancelInteractionBtn', 6), props: { label: 'Cancel', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
    ],
    dataSources: [
      {
        id: 'ds-contacts',
        name: 'Contacts',
        columns: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'company', label: 'Company', type: 'text' },
          { key: 'stage', label: 'Stage', type: 'text' },
          { key: 'priority', label: 'Priority', type: 'text' },
        ],
        records: [],
      },
      {
        id: 'ds-interactions',
        name: 'Interactions',
        columns: [
          { key: 'contact', label: 'Contact', type: 'text' },
          { key: 'type', label: 'Type', type: 'text' },
          { key: 'summary', label: 'Summary', type: 'text' },
          { key: 'outcome', label: 'Outcome', type: 'text' },
          { key: 'date', label: 'Date', type: 'date' },
        ],
        records: [],
      },
    ],
    settings: {
      theme: 'light',
      primaryColor: '#7c3aed',
      fontFamily: 'Inter, system-ui, sans-serif',
      showNavigation: true,
      allowExport: true,
    },
    variables: {},
  },
};

// ── Template 5: SOP Interactive Checklist ────────────────────────

const sopChecklistTemplate: StackTemplate = {
  id: 'tpl-sop-checklist',
  name: 'SOP Checklist',
  description: 'Interactive standard operating procedure with step tracking and sign-off.',
  category: 'Operations',
  icon: 'list-checks',
  tags: ['sop', 'checklist', 'procedure', 'compliance', 'operations'],
  stack: {
    name: 'SOP Checklist',
    description: 'Standard operating procedure with step tracking',
    version: '1.0.0',
    cards: [
      {
        ...createDefaultCard('Start', 0),
        description: 'Begin the procedure',
        components: [
          { ...createDefaultComponent('text', 'sopHeader', 0), props: { label: 'Standard Operating Procedure', fontSize: 'xl' } },
          { ...createDefaultComponent('text', 'sopDescription', 1), props: { label: 'Follow each step carefully. All items must be completed before sign-off.' } },
          { ...createDefaultComponent('input', 'operatorName', 2), props: { label: 'Operator Name', placeholder: 'Enter your full name' }, validation: [{ type: 'required', message: 'Operator name is required' }] },
          { ...createDefaultComponent('input', 'sopDate', 3), props: { label: 'Date', placeholder: 'YYYY-MM-DD' } },
          { ...createDefaultComponent('dropdown', 'location', 4), props: { label: 'Location', options: [{ label: 'Site A', value: 'site_a' }, { label: 'Site B', value: 'site_b' }, { label: 'Site C', value: 'site_c' }, { label: 'Remote', value: 'remote' }] } },
          { ...createDefaultComponent('button', 'beginBtn', 5), props: { label: 'Begin Procedure', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Preparation', 1),
        description: 'Preparation steps',
        components: [
          { ...createDefaultComponent('text', 'prepHeader', 0), props: { label: 'Phase 1: Preparation', fontSize: 'xl' } },
          { ...createDefaultComponent('checkbox', 'prep1', 1), props: { label: 'Verify equipment is calibrated and functional' } },
          { ...createDefaultComponent('checkbox', 'prep2', 2), props: { label: 'Review safety protocols and PPE requirements' } },
          { ...createDefaultComponent('checkbox', 'prep3', 3), props: { label: 'Confirm all materials are available' } },
          { ...createDefaultComponent('checkbox', 'prep4', 4), props: { label: 'Notify relevant stakeholders' } },
          { ...createDefaultComponent('input', 'prepNotes', 5), props: { label: 'Notes', placeholder: 'Document any issues...', multiline: true, rows: 2 } },
          { ...createDefaultComponent('button', 'prepBackBtn', 6), props: { label: 'Back', variant: 'secondary' } },
          { ...createDefaultComponent('button', 'prepNextBtn', 7), props: { label: 'Next Phase', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Execution', 2),
        description: 'Execution steps',
        components: [
          { ...createDefaultComponent('text', 'execHeader', 0), props: { label: 'Phase 2: Execution', fontSize: 'xl' } },
          { ...createDefaultComponent('checkbox', 'exec1', 1), props: { label: 'Execute primary procedure steps' } },
          { ...createDefaultComponent('checkbox', 'exec2', 2), props: { label: 'Record measurements and observations' } },
          { ...createDefaultComponent('checkbox', 'exec3', 3), props: { label: 'Verify output meets specifications' } },
          { ...createDefaultComponent('checkbox', 'exec4', 4), props: { label: 'Document any deviations from standard procedure' } },
          { ...createDefaultComponent('input', 'execNotes', 5), props: { label: 'Observations', placeholder: 'Record observations...', multiline: true, rows: 2 } },
          { ...createDefaultComponent('button', 'execBackBtn', 6), props: { label: 'Back', variant: 'secondary' } },
          { ...createDefaultComponent('button', 'execNextBtn', 7), props: { label: 'Next Phase', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Sign-Off', 3),
        description: 'Final sign-off',
        components: [
          { ...createDefaultComponent('text', 'signoffHeader', 0), props: { label: 'Phase 3: Sign-Off', fontSize: 'xl' } },
          { ...createDefaultComponent('checkbox', 'cleanupDone', 1), props: { label: 'Work area cleaned and secured' } },
          { ...createDefaultComponent('checkbox', 'documentationDone', 2), props: { label: 'All documentation completed' } },
          { ...createDefaultComponent('checkbox', 'reviewDone', 3), props: { label: 'Results reviewed and validated' } },
          { ...createDefaultComponent('dropdown', 'overallResult', 4), props: { label: 'Overall Result', options: [{ label: 'Pass', value: 'pass' }, { label: 'Pass with Observations', value: 'pass_observations' }, { label: 'Fail - Rework Needed', value: 'fail' }] } },
          { ...createDefaultComponent('input', 'finalNotes', 5), props: { label: 'Final Notes', placeholder: 'Any closing remarks...', multiline: true, rows: 2 } },
          { ...createDefaultComponent('button', 'signoffBackBtn', 6), props: { label: 'Back', variant: 'secondary' } },
          { ...createDefaultComponent('button', 'completeBtn', 7), props: { label: 'Complete Procedure', variant: 'primary' } },
        ],
        actions: [],
        rules: [],
      },
      {
        ...createDefaultCard('Complete', 4),
        description: 'Procedure completed',
        components: [
          { ...createDefaultComponent('text', 'completeHeader', 0), props: { label: 'Procedure Complete', fontSize: 'xl' } },
          { ...createDefaultComponent('text', 'completeMessage', 1), props: { label: 'The SOP has been completed and documented. A record has been saved for audit purposes.' } },
          { ...createDefaultComponent('button', 'newProcedureBtn', 2), props: { label: 'Start New Procedure', variant: 'secondary' } },
        ],
        actions: [],
        rules: [],
      },
    ],
    dataSources: [
      {
        id: 'ds-sop-records',
        name: 'SOP Records',
        columns: [
          { key: 'operator', label: 'Operator', type: 'text' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'location', label: 'Location', type: 'text' },
          { key: 'result', label: 'Result', type: 'text' },
          { key: 'notes', label: 'Notes', type: 'text' },
        ],
        records: [],
      },
    ],
    settings: {
      theme: 'light',
      primaryColor: '#0891b2',
      fontFamily: 'Inter, system-ui, sans-serif',
      showNavigation: true,
      allowExport: true,
    },
    variables: {},
  },
};

// ── Export all templates ──────────────────────────────────────────

export const TEMPLATES: StackTemplate[] = [
  intakeFormTemplate,
  approvalWorkflowTemplate,
  costCalculatorTemplate,
  crmTrackerTemplate,
  sopChecklistTemplate,
];

export function getTemplateById(id: string): StackTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
