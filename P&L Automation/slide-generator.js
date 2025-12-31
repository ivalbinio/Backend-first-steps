/**
 * AI Value Creation Slides Generator
 *
 * A standalone system for generating Pitch.com slides for AI Value Creation presentations.
 * Uses EDN format and can output Playwright automation scripts.
 */

const fs = require('fs');
const path = require('path');

// Load examples database
const examples = require('./examples.js');

// =============================================================================
// SYSTEM PROMPT - Core instructions for AI slide generation
// =============================================================================

const SYSTEM_PROMPT = `
You are an AI assistant specialized in creating high-quality consulting slides for AI Value Creation presentations.

## STYLE MANDATE
Write in McKinsey Partner style - sharp, without slop. Concise yet exhaustive. Every word earns its place.

## SLIDE FORMATTING RULES
- **Maximize line utilization**: Fill available space without exceeding bounds
- **No sparse slides**: Each element should feel balanced and complete
- **No overflow**: Never exceed character/line limits for any field
- **Professional density**: Match the information density of top-tier consulting decks

## CHARACTER LIMITS BY ELEMENT

### Heatmap Slide
| Element | Limit |
|---------|-------|
| Slide Title | 80-100 chars |
| Domain Name (Col 1) | 25 chars max |
| Workflow Name (Col 2) | 50 chars max |
| Pain Point (Col 3) | 60 chars max |
| Solution & Impact (Col 4) | 100 chars max |
| Bottom Box Title | 35 chars max |
| Bottom Box Description | 180 chars max (2-3 sentences) |
| Footer Attribution | 80 chars max |

### Angle Card Slide
| Element | Limit |
|---------|-------|
| Slide Title | 70-90 chars |
| Workflow Title | 45 chars max |
| Workflow Subtitle | 60 chars max |
| Challenge Bullet | 85 chars max (fill to max) |
| Solution Bullet | 85 chars max (fill to max) |
| Impact Bullet | 85 chars max (fill to max) |

CRITICAL: Each bullet must FILL the character limit as much as possible. Do not leave bullets sparse.

## CONTENT GUIDELINES

### Titles (McKinsey Takeaway Style)
- Format: "[Outcome] comes from [action/approach]"
- Action-oriented, insight-driven
- Specific to company/industry context
- Examples:
  - "Airline P&L impact comes from industrializing finance control and execution"
  - "Banking margin expansion requires automating high-friction regulatory workflows"

### Pain Points
- Current-state problems, not solutions
- Specific to workflow and industry
- Escalate: operational → strategic impact
- Use active voice, present tense

### Solutions
- Start with action verbs: Ingest, Automate, Simulate, Extract, Connect, Attribute, Forecast
- Technically credible but accessible
- Show progression: data → intelligence → action

### Impact Statements
- Quantified estimates with conservative ranges (10-15%, 20-30%, 2-3x)
- Cover efficiency, speed, and strategic dimensions
- Believable for the industry context
- Include percentages where it makes sense, but don't overdo it or make vague random claims

## AI/ML MENTIONS
- Only mention AI/ML where it genuinely adds value and makes sense
- Do NOT say "agentic" - use "AI" or "ML" instead
- Do NOT overdo AI mentions - be subtle and natural
- Focus on the business outcome, not the technology

## WORKFLOW ID CONVENTION
Use 2-letter domain abbreviation + number:
- PF1, PF2 (Planning & Forecasting)
- CA1, CA2 (Capital Allocation)
- RM1, RM2 (Revenue & Margin)
- CE1, CE2 (Cost Execution)
- WC1, WC2 (Working Capital)
- PG1, PG2 (Performance & Governance)
- DS1, DS2 (Decision Support)
- DA1, DA2 (Data Architecture)

## HEATMAP VERSIONS

### Version 1: Company P&L
Domains: Planning & Forecasting, Capital Allocation, Revenue & Margin, Cost Execution, Working Capital, Performance & Governance, Decision Support, Data Architecture

### Version 2: Company Domains (e.g., Banking)
Domains: Lending Operations, Deposit Management, Payments Processing, Risk & Compliance, Customer Onboarding, Treasury Operations, Regulatory Reporting, Data & Analytics

### Version 3: Vertical/Functional (e.g., Finance Dept)
Domains: FP&A, Treasury, Accounting & Close, Tax, Procurement, Internal Audit, Investor Relations, Shared Services

## THEMATIC PAIRING RULES
1. Cross-domain pairing preferred: Pair workflows from DIFFERENT domains
2. Find connecting insight: What strategic theme unites them?
3. Title format: "[Insight about high performers] through/via [connecting approach]"

## COLOR PALETTE (RGB)
- Dark text: {r: 84, g: 84, b: 101}
- Medium text: {r: 147, g: 157, b: 168}
- White: {r: 255, g: 255, b: 255}
- Dark background: {r: 43, g: 42, b: 53}
- Light gray bg: {r: 249, g: 249, b: 249}
- Border gray: {r: 229, g: 231, b: 240}
- Green checkmark: {r: 92, g: 216, b: 107}
- Red accent: {r: 194, g: 14, b: 26}

## FONT
TWK Lausanne: font-family "font-ff0051ea-2479-4922-b67e-04ab2bbea9c3"
`;

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  limits: {
    heatmap: {
      slideTitle: { min: 80, max: 100 },
      domainName: { max: 25 },
      workflowName: { max: 50 },
      painPoint: { max: 60 },
      solutionImpact: { max: 100 },
      bottomBoxTitle: { max: 35 },
      bottomBoxDescription: { max: 180 },
      footerAttribution: { max: 80 }
    },
    angleCard: {
      slideTitle: { min: 70, max: 90 },
      workflowTitle: { max: 45 },
      workflowSubtitle: { max: 60 },
      challengeBullet: { min: 70, max: 85 },  // Must fill to near max
      solutionBullet: { min: 70, max: 85 },   // Must fill to near max
      impactBullet: { min: 70, max: 85 }      // Must fill to near max
    }
  },
  colors: {
    darkText: { r: 84, g: 84, b: 101, a: 1 },
    mediumText: { r: 147, g: 157, b: 168, a: 1 },
    white: { r: 255, g: 255, b: 255, a: 1 },
    darkBg: { r: 43, g: 42, b: 53, a: 1 },
    lightGrayBg: { r: 249, g: 249, b: 249, a: 1 },
    borderGray: { r: 229, g: 231, b: 240, a: 1 },
    greenCheck: { r: 92, g: 216, b: 107, a: 1 },
    redAccent: { r: 194, g: 14, b: 26, a: 1 }
  },
  fonts: {
    primary: 'font-ff0051ea-2479-4922-b67e-04ab2bbea9c3',
    uuid: 'ff0051ea-2479-4922-b67e-04ab2bbea9c3'
  },
  icons: {
    baseUrl: 'https://icon-sets.static.services.pitch.com/icon-sets/',
    widgets: 'Material-Outlined/widgets.svg',
    addChart: 'Material-Outlined/add_chart.svg',
    repeat: 'Material-Outlined/repeat.svg',
    autoMode: 'Material-Outlined/auto_mode.svg',
    timeline: 'Material-Outlined/timeline.svg',
    analytics: 'Material-Outlined/analytics.svg',
    trackChanges: 'Material-Outlined/track_changes.svg',
    checkCircle: 'Material-Sharp/check_circle.svg',
    loyalty: 'Material-Outlined/loyalty.svg',
    supportAgent: 'Material-Outlined/support_agent.svg',
    inventory: 'Material-Outlined/inventory_2.svg'
  }
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

function validateLength(text, field, limits) {
  const len = text.length;
  const limit = limits[field];

  if (!limit) return { valid: true };

  if (limit.max && len > limit.max) {
    return {
      valid: false,
      error: `${field} exceeds max (${len}/${limit.max}): "${text.substring(0, 50)}..."`
    };
  }

  if (limit.min && len < limit.min) {
    return {
      valid: false,
      error: `${field} below min (${len}/${limit.min}): "${text}"`
    };
  }

  return { valid: true };
}

function validateHeatmapContent(content) {
  const errors = [];
  const limits = CONFIG.limits.heatmap;

  // Validate title
  if (content.title) {
    const result = validateLength(content.title, 'slideTitle', limits);
    if (!result.valid) errors.push(result.error);
  }

  // Validate rows
  if (content.rows) {
    content.rows.forEach((row, i) => {
      if (row.domain) {
        const r = validateLength(row.domain, 'domainName', limits);
        if (!r.valid) errors.push(`Row ${i}: ${r.error}`);
      }
      if (row.workflow) {
        const r = validateLength(row.workflow, 'workflowName', limits);
        if (!r.valid) errors.push(`Row ${i}: ${r.error}`);
      }
      if (row.painPoint) {
        const r = validateLength(row.painPoint, 'painPoint', limits);
        if (!r.valid) errors.push(`Row ${i}: ${r.error}`);
      }
      if (row.solution) {
        const r = validateLength(row.solution, 'solutionImpact', limits);
        if (!r.valid) errors.push(`Row ${i}: ${r.error}`);
      }
    });
  }

  // Validate bottom boxes
  if (content.bottomBoxes) {
    content.bottomBoxes.forEach((box, i) => {
      if (box.title) {
        const r = validateLength(box.title, 'bottomBoxTitle', limits);
        if (!r.valid) errors.push(`Box ${i}: ${r.error}`);
      }
      if (box.description) {
        const r = validateLength(box.description, 'bottomBoxDescription', limits);
        if (!r.valid) errors.push(`Box ${i}: ${r.error}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateAngleCardContent(content) {
  const errors = [];
  const limits = CONFIG.limits.angleCard;

  if (content.title) {
    const result = validateLength(content.title, 'slideTitle', limits);
    if (!result.valid) errors.push(result.error);
  }

  if (content.cards) {
    content.cards.forEach((card, i) => {
      if (card.workflowTitle) {
        const r = validateLength(card.workflowTitle, 'workflowTitle', limits);
        if (!r.valid) errors.push(`Card ${i}: ${r.error}`);
      }
      if (card.subtitle) {
        const r = validateLength(card.subtitle, 'workflowSubtitle', limits);
        if (!r.valid) errors.push(`Card ${i}: ${r.error}`);
      }
      if (card.challenges) {
        card.challenges.forEach((c, j) => {
          const r = validateLength(c, 'challengeBullet', limits);
          if (!r.valid) errors.push(`Card ${i} Challenge ${j}: ${r.error}`);
        });
      }
      if (card.solutions) {
        card.solutions.forEach((s, j) => {
          const r = validateLength(s, 'solutionBullet', limits);
          if (!r.valid) errors.push(`Card ${i} Solution ${j}: ${r.error}`);
        });
      }
      if (card.impacts) {
        card.impacts.forEach((imp, j) => {
          const r = validateLength(imp, 'impactBullet', limits);
          if (!r.valid) errors.push(`Card ${i} Impact ${j}: ${r.error}`);
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// EDN GENERATION UTILITIES
// =============================================================================

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function colorToEdn(color) {
  return `{:r ${color.r}, :g ${color.g}, :b ${color.b}, :a ${color.a}}`;
}

function escapeEdnString(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '\\"');
}

// =============================================================================
// EDN TEXT REPLACEMENT UTILITIES
// These functions allow programmatic text replacement in EDN while preserving
// the exact structure - ONLY the text content changes, nothing else.
// =============================================================================

/**
 * Replace text content in an EDN string while preserving all structure.
 * This is the ONLY way to safely modify EDN slides.
 *
 * @param {string} edn - The original EDN string
 * @param {string} oldText - The exact text to find
 * @param {string} newText - The replacement text
 * @returns {string} - The modified EDN string
 */
function replaceEdnText(edn, oldText, newText) {
  // Escape special characters for EDN/HTML context
  const escapedOld = escapeEdnString(oldText);
  const escapedNew = escapeEdnString(newText);

  // Replace in body content (HTML within EDN)
  return edn.replace(new RegExp(escapeRegExp(escapedOld), 'g'), escapedNew);
}

/**
 * Replace multiple text contents in an EDN string.
 *
 * @param {string} edn - The original EDN string
 * @param {Object} replacements - Object with {oldText: newText} pairs
 * @returns {string} - The modified EDN string
 */
function replaceEdnTextMultiple(edn, replacements) {
  let result = edn;
  for (const [oldText, newText] of Object.entries(replacements)) {
    result = replaceEdnText(result, oldText, newText);
  }
  return result;
}

/**
 * Replace text in a specific section (challenges, solutions, or impacts) of an angle card.
 *
 * @param {string} edn - The original EDN string
 * @param {string} section - 'challenges' | 'solutions' | 'impacts'
 * @param {number} index - The bullet index (0-based)
 * @param {string} newText - The new bullet text
 * @param {string} oldText - The old bullet text to replace
 * @returns {string} - The modified EDN string
 */
function replaceAngleCardBullet(edn, section, index, oldText, newText) {
  return replaceEdnText(edn, oldText, newText);
}

/**
 * Replace table cell content in a heatmap EDN.
 *
 * @param {string} edn - The original EDN string
 * @param {string} oldCellContent - The exact cell content to find
 * @param {string} newCellContent - The replacement content
 * @returns {string} - The modified EDN string
 */
function replaceHeatmapCell(edn, oldCellContent, newCellContent) {
  // Table cells are wrapped in <p> tags
  const oldWrapped = `<p>${escapeEdnString(oldCellContent)}</p>`;
  const newWrapped = `<p>${escapeEdnString(newCellContent)}</p>`;
  return edn.replace(oldWrapped, newWrapped);
}

/**
 * Replace the workflow title in an angle card.
 * Handles the italic/bold formatting.
 *
 * @param {string} edn - The original EDN string
 * @param {string} oldTitle - The old workflow title
 * @param {string} newTitle - The new workflow title
 * @returns {string} - The modified EDN string
 */
function replaceWorkflowTitle(edn, oldTitle, newTitle) {
  return replaceEdnText(edn, oldTitle, newTitle);
}

/**
 * Replace the slide main title.
 *
 * @param {string} edn - The original EDN string
 * @param {string} oldTitle - The old title
 * @param {string} newTitle - The new title
 * @returns {string} - The modified EDN string
 */
function replaceSlideTitle(edn, oldTitle, newTitle) {
  return replaceEdnText(edn, oldTitle, newTitle);
}

/**
 * Replace the icon URL in an EDN string.
 *
 * @param {string} edn - The original EDN string
 * @param {string} oldIcon - The old icon path (e.g., 'Material-Outlined/timeline.svg')
 * @param {string} newIcon - The new icon path
 * @returns {string} - The modified EDN string
 */
function replaceIcon(edn, oldIcon, newIcon) {
  const baseUrl = CONFIG.icons.baseUrl;
  const oldUrl = baseUrl + oldIcon;
  const newUrl = baseUrl + newIcon;
  return edn.replace(oldUrl, newUrl);
}

/**
 * Helper function to escape special regex characters.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract all text content from an EDN string for analysis.
 *
 * @param {string} edn - The EDN string to analyze
 * @returns {Object} - Object containing extracted text elements
 */
function extractEdnTextContent(edn) {
  const result = {
    titles: [],
    bullets: [],
    paragraphs: []
  };

  // Extract text from :body fields
  const bodyRegex = /:body\s+"([^"]+)"/g;
  let match;
  while ((match = bodyRegex.exec(edn)) !== null) {
    const content = match[1];
    // Parse HTML content
    const textContent = content
      .replace(/<[^>]+>/g, '')  // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    if (content.includes('<li>')) {
      result.bullets.push(textContent);
    } else if (content.includes('font-weight:700') || content.includes('font-weight:500')) {
      result.titles.push(textContent);
    } else {
      result.paragraphs.push(textContent);
    }
  }

  return result;
}

/**
 * Validate that EDN structure is preserved after text replacement.
 *
 * @param {string} originalEdn - The original EDN string
 * @param {string} modifiedEdn - The modified EDN string
 * @returns {Object} - Validation result with success flag and any errors
 */
function validateEdnStructure(originalEdn, modifiedEdn) {
  const errors = [];

  // Check that key structural elements are preserved
  const structuralPatterns = [
    ':format :pointed-dict',
    ':entity-type :block',
    ':block-type :text',
    ':block-type :shape',
    ':block-type :image',
    ':coords',
    '#uuid'
  ];

  for (const pattern of structuralPatterns) {
    const originalCount = (originalEdn.match(new RegExp(escapeRegExp(pattern), 'g')) || []).length;
    const modifiedCount = (modifiedEdn.match(new RegExp(escapeRegExp(pattern), 'g')) || []).length;

    if (originalCount !== modifiedCount) {
      errors.push(`Structure mismatch for '${pattern}': original=${originalCount}, modified=${modifiedCount}`);
    }
  }

  // Check that the EDN is still valid (basic bracket matching)
  const openBrackets = (modifiedEdn.match(/\{/g) || []).length;
  const closeBrackets = (modifiedEdn.match(/\}/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push(`Bracket mismatch: { = ${openBrackets}, } = ${closeBrackets}`);
  }

  const openSquare = (modifiedEdn.match(/\[/g) || []).length;
  const closeSquare = (modifiedEdn.match(/\]/g) || []).length;
  if (openSquare !== closeSquare) {
    errors.push(`Square bracket mismatch: [ = ${openSquare}, ] = ${closeSquare}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================================================
// CONTEXT GATHERING QUESTIONS
// =============================================================================

const CONTEXT_QUESTIONS = {
  phase1: [
    {
      id: 'version',
      question: 'Which heatmap structure would you like?',
      options: [
        'Version 1: Company P&L - Organized by P&L line items (Revenue, COGS, SG&A, Working Capital)',
        'Version 2: Company Domains - Organized by business domains (e.g., Banking: Lending, Deposits)',
        'Version 3: Vertical Domains - Organized by functional departments (e.g., Finance: FP&A, Treasury)'
      ]
    },
    {
      id: 'company',
      question: 'What is the company name and industry/sector?'
    },
    {
      id: 'audience',
      question: 'Who is the primary reader? (Name, Title, Key concerns/priorities)'
    },
    {
      id: 'painPoints',
      question: 'Were any specific pain points or workflows mentioned in prior conversations? (These will be marked with checkmarks)',
      optional: true
    }
  ]
};

// =============================================================================
// DOMAIN TEMPLATES
// =============================================================================

const DOMAIN_TEMPLATES = {
  v1_pl: [
    { abbr: 'PF', name: 'Planning & Forecasting' },
    { abbr: 'CA', name: 'Capital Allocation' },
    { abbr: 'RM', name: 'Revenue & Margin' },
    { abbr: 'CE', name: 'Cost Execution' },
    { abbr: 'WC', name: 'Working Capital' },
    { abbr: 'PG', name: 'Performance & Governance' },
    { abbr: 'DS', name: 'Decision Support' },
    { abbr: 'DA', name: 'Data Architecture' }
  ],
  v2_banking: [
    { abbr: 'LO', name: 'Lending Operations' },
    { abbr: 'DM', name: 'Deposit Management' },
    { abbr: 'PP', name: 'Payments Processing' },
    { abbr: 'RC', name: 'Risk & Compliance' },
    { abbr: 'CO', name: 'Customer Onboarding' },
    { abbr: 'TO', name: 'Treasury Operations' },
    { abbr: 'RR', name: 'Regulatory Reporting' },
    { abbr: 'DA', name: 'Data & Analytics' }
  ],
  v3_finance: [
    { abbr: 'FP', name: 'FP&A' },
    { abbr: 'TR', name: 'Treasury' },
    { abbr: 'AC', name: 'Accounting & Close' },
    { abbr: 'TX', name: 'Tax' },
    { abbr: 'PR', name: 'Procurement' },
    { abbr: 'IA', name: 'Internal Audit' },
    { abbr: 'IR', name: 'Investor Relations' },
    { abbr: 'SS', name: 'Shared Services' }
  ]
};

// =============================================================================
// SLIDE GENERATOR CLASS
// =============================================================================

class SlideGenerator {
  constructor() {
    this.context = {};
    this.heatmap = null;
    this.angleCards = [];
    this.examples = examples;
  }

  // Get system prompt for external AI integration
  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  // Get configuration
  getConfig() {
    return CONFIG;
  }

  // Get context questions
  getContextQuestions() {
    return CONTEXT_QUESTIONS;
  }

  // Set context from gathered answers
  setContext(answers) {
    this.context = {
      version: answers.version,
      company: answers.company,
      industry: answers.industry,
      audience: {
        name: answers.audienceName,
        title: answers.audienceTitle,
        concerns: answers.audienceConcerns
      },
      painPoints: answers.painPoints || [],
      mentionedWorkflows: answers.mentionedWorkflows || []
    };
  }

  // Get example EDN by type
  getExample(type) {
    if (this.examples && this.examples[type]) {
      return this.examples[type];
    }
    return null;
  }

  // Validate content before generation
  validateContent(type, content) {
    if (type === 'heatmap') {
      return validateHeatmapContent(content);
    } else if (type === 'angleCard') {
      return validateAngleCardContent(content);
    }
    return { valid: true, errors: [] };
  }

  // Generate prompt for AI to create heatmap content
  generateHeatmapPrompt() {
    const domains = this.getDomainTemplate();

    return `
Generate a High-ROI Agentic Workflows Heatmap for:
- Company: ${this.context.company}
- Industry: ${this.context.industry}
- Audience: ${this.context.audience.name}, ${this.context.audience.title}
- Key Concerns: ${this.context.audience.concerns}
${this.context.painPoints.length > 0 ? `- Mentioned Pain Points (mark with checkmark): ${this.context.painPoints.join(', ')}` : ''}

Use domains: ${domains.map(d => d.name).join(', ')}

Generate:
1. 14-17 workflow rows (2 per domain typically)
2. 5 McKinsey-style title options
3. 3 thematic bottom boxes

Follow character limits strictly:
- Domain Name: max 25 chars
- Workflow Name: max 50 chars
- Pain Point: max 60 chars
- Solution & Impact: max 100 chars
- Slide Title: 80-100 chars
- Bottom Box Title: max 35 chars
- Bottom Box Description: max 180 chars

Output as JSON with this structure:
{
  "titles": ["option1", "option2", "option3", "option4", "option5"],
  "rows": [
    {"domain": "...", "workflow": "PF1. Name", "painPoint": "...", "solution": "...", "hasCheckmark": false}
  ],
  "bottomBoxes": [
    {"icon": "widgets", "title": "...", "description": "..."}
  ],
  "footer": "Case Mentioned in Introduction Call by Name (Title)" // if checkmarks present
}
`;
  }

  // Generate prompt for AI to create angle card content
  generateAngleCardPrompt(workflowPairs) {
    return `
Generate Angle Card slides for these workflow pairs:
${workflowPairs.map((pair, i) => `
Pair ${i + 1}: ${pair[0].id} (${pair[0].name}) + ${pair[1].id} (${pair[1].name})
Theme: ${pair.theme || 'Identify connecting theme'}
`).join('\n')}

For each pair, generate:
1. 5 slide title options (McKinsey takeaway style)
2. For each workflow card:
   - Domain header with icon suggestion
   - Workflow title and subtitle
   - 3 CHALLENGES bullets (current-state problems)
   - 5 SOLUTION bullets (AI capabilities)
   - 3 IMPACT bullets (quantified results)

Follow character limits strictly:
- Slide Title: 70-90 chars
- Workflow Title: max 45 chars
- Workflow Subtitle: max 50 chars
- Challenge Bullet: max 55 chars
- Solution Bullet: max 65 chars
- Impact Bullet: max 50 chars

Output as JSON with this structure:
{
  "slides": [
    {
      "titles": ["option1", ...],
      "selectedTitle": null,
      "cards": [
        {
          "domain": "Planning & Forecasting",
          "icon": "timeline",
          "workflowId": "PF1",
          "workflowTitle": "...",
          "subtitle": "...",
          "challenges": ["...", "...", "..."],
          "solutions": ["...", "...", "...", "...", "..."],
          "impacts": ["...", "...", "..."]
        }
      ]
    }
  ]
}
`;
  }

  // Get domain template based on version
  getDomainTemplate() {
    switch (this.context.version) {
      case 1: return DOMAIN_TEMPLATES.v1_pl;
      case 2: return DOMAIN_TEMPLATES.v2_banking;
      case 3: return DOMAIN_TEMPLATES.v3_finance;
      default: return DOMAIN_TEMPLATES.v1_pl;
    }
  }

  // Export for Playwright automation
  exportForPlaywright(slides) {
    return {
      systemPrompt: SYSTEM_PROMPT,
      config: CONFIG,
      context: this.context,
      slides: slides.map(s => ({
        type: s.type,
        edn: s.edn,
        validation: this.validateContent(s.type, s.content)
      }))
    };
  }
}

// =============================================================================
// PLAYWRIGHT AUTOMATION SCRIPT GENERATOR
// =============================================================================

function generatePlaywrightScript(presentationUrl) {
  return `
const { chromium } = require('playwright');

/**
 * Pitch.com Slide Automation
 * Generated by AI Value Creation Slides Generator
 */

async function createSlides(ednSlides, presentationUrl) {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    storageState: 'pitch-auth.json'
  });

  const page = await context.newPage();

  try {
    // Navigate to presentation
    await page.goto(presentationUrl);
    await page.waitForSelector('[data-testid="slide-canvas"]', { timeout: 30000 });

    for (let i = 0; i < ednSlides.length; i++) {
      console.log(\`Creating slide \${i + 1}/\${ednSlides.length}...\`);

      // Create new slide
      await page.keyboard.press('Meta+m');
      await page.waitForTimeout(1000);

      // Select all and delete
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(500);

      // Copy EDN to clipboard and paste
      await page.evaluate(async (edn) => {
        await navigator.clipboard.writeText(edn);
      }, ednSlides[i]);

      await page.keyboard.press('Meta+v');
      await page.waitForTimeout(2000);
    }

    console.log('All slides created successfully!');

  } catch (error) {
    console.error('Error creating slides:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function saveAuthState() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://app.pitch.com/login');

  console.log('Please log in manually, then press Enter in the terminal...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  await context.storageState({ path: 'pitch-auth.json' });
  console.log('Auth state saved to pitch-auth.json');

  await browser.close();
}

module.exports = { createSlides, saveAuthState };

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'auth') {
    saveAuthState();
  } else if (args[0] === 'create' && args[1]) {
    const slidesFile = args[1];
    const url = args[2] || '${presentationUrl || 'YOUR_PRESENTATION_URL'}';

    const slides = require(slidesFile);
    createSlides(slides, url);
  } else {
    console.log('Usage:');
    console.log('  node pitch-automation.js auth              # Save auth state');
    console.log('  node pitch-automation.js create slides.json [url]  # Create slides');
  }
}
`;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  SlideGenerator,
  SYSTEM_PROMPT,
  CONFIG,
  CONTEXT_QUESTIONS,
  DOMAIN_TEMPLATES,
  generatePlaywrightScript,
  validateHeatmapContent,
  validateAngleCardContent,
  generateUUID,
  colorToEdn,
  escapeEdnString,
  // EDN Text Replacement Utilities
  replaceEdnText,
  replaceEdnTextMultiple,
  replaceAngleCardBullet,
  replaceHeatmapCell,
  replaceWorkflowTitle,
  replaceSlideTitle,
  replaceIcon,
  extractEdnTextContent,
  validateEdnStructure
};

// =============================================================================
// CLI INTERFACE
// =============================================================================

if (require.main === module) {
  const generator = new SlideGenerator();

  console.log('='.repeat(60));
  console.log('AI Value Creation Slides Generator');
  console.log('='.repeat(60));
  console.log('\nSystem Prompt available via: generator.getSystemPrompt()');
  console.log('Configuration available via: generator.getConfig()');
  console.log('\nTo use with an AI API:');
  console.log('1. Import this module');
  console.log('2. Use getSystemPrompt() as the system message');
  console.log('3. Gather context using getContextQuestions()');
  console.log('4. Generate prompts with generateHeatmapPrompt() / generateAngleCardPrompt()');
  console.log('5. Validate content with validateContent()');
  console.log('6. Export for Playwright with exportForPlaywright()');
  console.log('\nExample EDN templates loaded from examples.js');
}
