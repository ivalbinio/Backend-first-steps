/**
 * Test EDN Editor - Validates programmatic EDN text replacement
 *
 * This test ensures the edn-editor.js module correctly replaces text
 * while preserving EDN structure for Pitch.com slides.
 */

const ednEditor = require('./edn-editor');

// Sample EDN snippet (from actual Etihad Airways heatmap)
const SAMPLE_TABLE_EDN = `{:entity-type :block, :table-data [["<p>Finance Control Domain</p>" "<p>Highest-ROI Workflows</p>" "<p>Pain Points</p>" "<p>Agentic Solution and P&amp;L Impact</p>"] ["<p>Planning &amp; Forecasting</p>" "<p>PF1. Integrated Rolling Forecast &amp; Ops Signals</p>" "<p>Forecasts distorted by disruptions &amp; crew costs.</p>" "<p>Ingest disruption events &amp; crew schedules to update outlooks, reduce error, and restore guidance credibility.</p>"] ["<p></p>" "<p>PF2. Driver-Level Forecast Explainability</p>" "<p>Manual overrides without traceability.</p>" "<p>Attribute changes to specific drivers (crew, fuel, disruptions) to improve transparency and confidence.</p>"]], :font-size 0.4, :block-type :table}`;

const SAMPLE_TITLE_EDN = `{:entity-type :block, :block-type :text, :body "<p><span style=\\"font-weight:700\\">Airline P&amp;L impact comes from industrializing finance control and execution</span></p>"}`;

const SAMPLE_BULLET_EDN = `{:entity-type :block, :block-type :text, :body "<ul><li><p>Route profitability analysis relies on month-old actuals and estimates</p></li><li><p>Competitive and demand signals not integrated into P&L calculations</p></li><li><p>Manual consolidation delays decision-making on route adjustments</p></li></ul>"}`;

// Test results tracking
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertIncludes(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`${message}\n  String does not include: ${substring}`);
  }
}

function assertNotIncludes(str, substring, message) {
  if (str.includes(substring)) {
    throw new Error(`${message}\n  String unexpectedly includes: ${substring}`);
  }
}

console.log('='.repeat(60));
console.log('EDN Editor Test Suite');
console.log('='.repeat(60));
console.log();

// Test 1: Basic text replacement
test('replaceText - basic replacement', () => {
  const result = ednEditor.replaceText(SAMPLE_TITLE_EDN, 'Airline P&L impact', 'Aviation Finance value');
  assertIncludes(result, 'Aviation Finance value', 'Should contain new text');
  assertNotIncludes(result, 'Airline P&L impact', 'Should not contain old text');
});

// Test 2: Text escaping for special characters
test('escapeEdnText - handles ampersands', () => {
  const result = ednEditor.escapeEdnText('Planning & Forecasting');
  assertEqual(result, 'Planning &amp; Forecasting', 'Ampersand should be escaped');
});

test('escapeEdnText - handles quotes', () => {
  const result = ednEditor.escapeEdnText('He said "hello"');
  assertEqual(result, 'He said \\"hello\\"', 'Quotes should be escaped');
});

test('escapeEdnText - handles angle brackets', () => {
  const result = ednEditor.escapeEdnText('x < y > z');
  assertEqual(result, 'x &lt; y &gt; z', 'Angle brackets should be escaped');
});

// Test 3: Unescape text
test('unescapeEdnText - reverses escaping', () => {
  const result = ednEditor.unescapeEdnText('Planning &amp; Forecasting');
  assertEqual(result, 'Planning & Forecasting', 'Ampersand should be unescaped');
});

// Test 4: Table cell replacement
test('replaceTableCell - replaces cell content', () => {
  const result = ednEditor.replaceTableCell(
    SAMPLE_TABLE_EDN,
    'Finance Control Domain',
    'P&L Control Domain'
  );
  assertIncludes(result, '<p>P&amp;L Control Domain</p>', 'Should contain new cell');
  assertNotIncludes(result, '<p>Finance Control Domain</p>', 'Should not contain old cell');
});

test('replaceTableCell - preserves structure', () => {
  const result = ednEditor.replaceTableCell(
    SAMPLE_TABLE_EDN,
    'Finance Control Domain',
    'New Domain Name'
  );
  assertIncludes(result, ':entity-type :block', 'Should preserve entity-type');
  assertIncludes(result, ':block-type :table', 'Should preserve block-type');
  assertIncludes(result, ':table-data', 'Should preserve table-data key');
});

// Test 5: Workflow title replacement
test('replaceWorkflowTitle - replaces workflow', () => {
  const result = ednEditor.replaceWorkflowTitle(
    SAMPLE_TABLE_EDN,
    'Integrated Rolling Forecast & Ops Signals',
    'AI-Powered Rolling Forecasts'
  );
  assertIncludes(result, 'AI-Powered Rolling Forecasts', 'Should contain new title');
});

// Test 6: Bullet point replacement
test('replaceBullet - replaces bullet text', () => {
  const result = ednEditor.replaceBullet(
    SAMPLE_BULLET_EDN,
    'Route profitability analysis relies on month-old actuals and estimates',
    'Finance teams lack real-time route profitability visibility across network'
  );
  assertIncludes(result, 'Finance teams lack real-time', 'Should contain new bullet');
});

// Test 7: Multiple replacements
test('replaceMultiple - handles multiple replacements', () => {
  const result = ednEditor.replaceMultiple(SAMPLE_TITLE_EDN, {
    'Airline': 'Aviation',
    'P&L': 'Margin',
    'industrializing': 'automating'
  });
  assertIncludes(result, 'Aviation', 'Should contain Aviation');
  assertIncludes(result, 'Margin', 'Should contain Margin');
  assertIncludes(result, 'automating', 'Should contain automating');
});

// Test 8: Structure validation
test('validateStructure - validates unchanged structure', () => {
  const modified = ednEditor.replaceText(SAMPLE_TABLE_EDN, 'Finance Control Domain', 'New Domain');
  const validation = ednEditor.validateStructure(SAMPLE_TABLE_EDN, modified);
  assertEqual(validation.valid, true, 'Structure should be valid');
  assertEqual(validation.errors.length, 0, 'Should have no errors');
});

test('validateStructure - detects bracket imbalance', () => {
  const broken = SAMPLE_TABLE_EDN.replace('}', ''); // Remove closing brace
  const validation = ednEditor.validateStructure(SAMPLE_TABLE_EDN, broken);
  assertEqual(validation.valid, false, 'Should detect invalid structure');
});

// Test 9: Extract text content
test('extractTextContent - extracts body content', () => {
  const content = ednEditor.extractTextContent(SAMPLE_TITLE_EDN);
  assertEqual(content.titles.length > 0 || content.paragraphs.length > 0, true, 'Should extract some content');
});

// Test 10: Icon replacement
test('replaceIcon - replaces icon path', () => {
  const ednWithIcon = `{:url "https://icon-sets.static.services.pitch.com/icon-sets/Material-Outlined/widgets.svg"}`;
  const result = ednEditor.replaceIcon(ednWithIcon, 'Material-Outlined/widgets.svg', 'Material-Outlined/analytics.svg');
  assertIncludes(result, 'analytics.svg', 'Should contain new icon');
  assertNotIncludes(result, 'widgets.svg', 'Should not contain old icon');
});

// Test 11: Real-world heatmap generation
test('generateHeatmapEdn - generates modified heatmap', () => {
  const content = {
    title: 'New Slide Title',
    originalTitle: 'Airline P&L impact comes from industrializing finance control and execution',
    rows: [
      {
        // Use the full workflow name as it appears in the EDN
        originalWorkflow: 'PF1. Integrated Rolling Forecast & Ops Signals',
        workflow: 'PF1. AI-Driven Rolling Forecasts',
        originalPainPoint: 'Forecasts distorted by disruptions & crew costs.',
        painPoint: 'Static forecasts miss real-time operational signals'
      }
    ]
  };

  const fullEdn = SAMPLE_TITLE_EDN + SAMPLE_TABLE_EDN;
  const result = ednEditor.generateHeatmapEdn(fullEdn, content);

  assertIncludes(result, 'New Slide Title', 'Should contain new title');
  assertIncludes(result, 'AI-Driven Rolling Forecasts', 'Should contain new workflow');
});

// Test 12: Slide title replacement
test('replaceSlideTitle - replaces main title', () => {
  const result = ednEditor.replaceSlideTitle(
    SAMPLE_TITLE_EDN,
    'Airline P&L impact comes from industrializing finance control and execution',
    'Aviation finance excellence requires industrialized AI workflows'
  );
  assertIncludes(result, 'Aviation finance excellence', 'Should contain new title');
});

// Summary
console.log();
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
