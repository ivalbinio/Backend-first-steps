# Pitch.com EDN Editor

Programmatic text replacement for Pitch.com EDN format.

## How It Works

Pitch.com uses EDN (Extensible Data Notation) as its internal data format. The workflow for creating slides is:

1. Copy an existing slide from Pitch.com (Cmd+C) - this copies EDN to clipboard
2. Programmatically modify the EDN text content using `edn-editor.js`
3. Paste the modified EDN back into Pitch.com (Cmd+V)

**CRITICAL**: Only modify text content. The EDN structure (UUIDs, coordinates, formatting) MUST remain unchanged.

## Files

### `edn-editor.js`

Core module for programmatic EDN text replacement:

```javascript
const ednEditor = require('./edn-editor');

// Replace any text
const newEdn = ednEditor.replaceText(templateEdn, 'old text', 'new text');

// Replace multiple texts at once
const newEdn = ednEditor.replaceMultiple(templateEdn, {
  'Old Title': 'New Title',
  'Old Bullet': 'New Bullet'
});

// Replace table cells (for heatmaps)
const newEdn = ednEditor.replaceTableCell(edn, 'Old Cell', 'New Cell');

// Replace bullet points
const newEdn = ednEditor.replaceBullet(edn, 'Old bullet', 'New bullet');

// Replace workflow titles
const newEdn = ednEditor.replaceWorkflowTitle(edn, 'Old Title', 'New Title');

// Validate structure is preserved
const validation = ednEditor.validateStructure(original, modified);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

### High-Level Generators

For common slide types:

```javascript
// Generate heatmap from template
const newEdn = ednEditor.generateHeatmapEdn(templateEdn, {
  title: 'New Slide Title',
  originalTitle: 'Template Title',
  rows: [
    {
      originalWorkflow: 'PF1. Old Workflow Name',
      workflow: 'PF1. New Workflow Name',
      originalPainPoint: 'Old pain point text',
      painPoint: 'New pain point text',
      originalSolution: 'Old solution text',
      solution: 'New solution text'
    }
  ]
});

// Generate angle card from template
const newEdn = ednEditor.generateAngleCardEdn(templateEdn, {
  title: 'New Card Title',
  originalTitle: 'Template Title',
  workflows: [
    {
      originalTitle: 'Old Workflow',
      title: 'New Workflow',
      originalChallenges: ['Old challenge 1', 'Old challenge 2'],
      challenges: ['New challenge 1', 'New challenge 2'],
      originalSolutions: ['Old solution 1'],
      solutions: ['New solution 1'],
      originalImpacts: ['Old impact 1'],
      impacts: ['New impact 1']
    }
  ]
});
```

### `test-edn-editor.js`

Test suite validating the EDN editor functions:

```bash
node test-edn-editor.js
```

## Character Limits

All bullets must follow these limits and FILL to near-max:

| Element | Max Length | Target |
|---------|-----------|--------|
| Challenge bullet | 85 chars | 70-85 chars |
| Solution bullet | 85 chars | 70-85 chars |
| Impact bullet | 85 chars | 70-85 chars |
| Slide title | 90 chars | 70-90 chars |
| Workflow subtitle | 60 chars | 45-60 chars |

## Workflow

### Manual (Single Slides)

1. Generate content at `localhost:3001`
2. In Pitch.com, select template slide
3. Copy (Cmd+C) to get EDN
4. Use edn-editor to replace text programmatically
5. Paste (Cmd+V) back into Pitch.com

### Automated (Batch Creation)

```javascript
const ednEditor = require('./edn-editor');
const templates = require('../examples'); // EDN templates

// Get template EDN
const templateEdn = templates.clients[0].slides[0].edn;

// Generate content for each workflow
const workflows = generateWorkflowContent(); // from your AI

// Replace each workflow's content
let modifiedEdn = templateEdn;
for (const wf of workflows) {
  modifiedEdn = ednEditor.replaceTableCell(modifiedEdn, wf.original, wf.new);
}

// Validate before pasting
const validation = ednEditor.validateStructure(templateEdn, modifiedEdn);
if (validation.valid) {
  console.log('EDN ready to paste');
  // Copy modifiedEdn to clipboard
}
```
