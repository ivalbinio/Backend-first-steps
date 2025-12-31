# P&L Automation - Development Progress

## Project Overview

AI Value Creation Slides Generator - A Node.js application that generates McKinsey-style consulting slides for Pitch.com presentations. The system uses OpenAI's API to generate content and outputs Pitch.com EDN format.

## Session Progress (December 31, 2025)

### 1. Canonical Template System

**Implemented:** Loading EDN templates from `prompts/templates/` directory instead of hardcoded `examples.js`.

**Files Created/Modified:**
- `index.html` - Added `loadCanonicalTemplates()` function
- `server.js` - Added `.edn` MIME type

**Template Files Available:**
| Template | Description |
|----------|-------------|
| `heatmap_pnl_canonical.edn` | P&L heatmap with 16 workflow rows + "on call" footer |
| `heatmap_pnl_simple_canonical.edn` | Simple P&L heatmap (no "on call" mention) |
| `angle_cards_double_canonical.edn` | 2 workflow cards with domain headers |
| `angle_cards_triple_canonical.edn` | 3 workflow cards (Portuguese example) |

**Functions:**
```javascript
// Load templates on page init
await loadCanonicalTemplates();

// Get templates
getHeatmapEdnTemplate()        // heatmap_pnl_canonical.edn
getHeatmapSimpleEdnTemplate()  // heatmap_pnl_simple_canonical.edn
getAngleCardEdnTemplate()      // angle_cards_double_canonical.edn
getAngleCardTripleEdnTemplate() // angle_cards_triple_canonical.edn
```

---

### 2. Heatmap Cell Editing

**Implemented:** Click-to-edit functionality for heatmap Pain Point and Solution cells.

**Features:**
- Click any Pain Point or Solution cell to edit
- Modal popup with textarea
- Live character count display
- Target: 50-80 chars for optimal fit
- Save/Cancel buttons
- Table refreshes with edits preserved

**CSS Added:**
```css
.editable-cell {
  cursor: pointer;
  transition: background 0.2s;
}
.editable-cell:hover {
  background: rgba(37, 99, 235, 0.15);
}
.editable-cell .edit-icon {
  opacity: 0; /* Shows on hover */
}
```

**Functions:**
- `editHeatmapCell(rowIdx, field)` - Opens edit modal
- `saveHeatmapEdit(rowIdx, field)` - Saves changes
- `closeEditModal()` - Closes modal

---

### 3. Strict Character Limits (70-85 chars for Angle Cards)

**Implemented:** Hard enforcement of character limits at multiple levels.

#### Server-Side Enforcement (`server.js`)

All API endpoints now truncate bullets exceeding 85 chars:

```javascript
function enforceLimit(text) {
  if (!text) return text;
  text = text.trim();
  if (text.length <= MAX_CHARS) return text;
  let cut = text.lastIndexOf(' ', MAX_CHARS - 2);
  if (cut < 50) cut = MAX_CHARS - 2;
  let result = text.substring(0, cut).trim();
  if (!/[.!?]$/.test(result)) result += '.';
  // Final safety check - HARD truncate
  if (result.length > MAX_CHARS) {
    result = result.substring(0, MAX_CHARS - 1) + '.';
  }
  return result;
}
```

**Endpoints with enforcement:**
- `POST /api/generate-angle-card` - challenges, solutions, impacts
- `POST /api/regenerate-content` - challenges, solutions, impacts
- `POST /api/generate-heatmap` - painPoint (80), solution (100), name (50)

#### Client-Side Enforcement (`index.html`)

```javascript
function enforceBulletMax(text, max = 85) {
  if (!text) return text;
  text = text.trim();
  if (text.length <= max) return text;
  let cut = text.lastIndexOf(' ', max - 2);
  if (cut < 50) cut = max - 2;
  let result = text.substring(0, cut).trim();
  if (!/[.!?]$/.test(result)) result += '.';
  // HARD truncate if still over
  if (result.length > max) {
    result = result.substring(0, max - 1) + '.';
  }
  return result;
}
```

**Applied at:**
1. Fallback template generators (`generateChallenges`, `generateSolutions`, `generateImpacts`)
2. Display in angle card preview
3. EDN generation for final export

#### Character Limits Summary

**Heatmap:**
- Domain: max 25 chars
- Workflow name: max 50 chars
- Pain Point: 50-80 chars (STRICT)
- Solution: 70-100 chars (STRICT)
- Title: 80-100 chars

**Angle Cards:**
- Title: 70-90 chars
- Workflow Title: max 45 chars
- Subtitle: max 60 chars
- Challenge bullets: **EXACTLY 70-85 chars**
- Solution bullets: **EXACTLY 70-85 chars**
- Impact bullets: **EXACTLY 70-85 chars**

---

### 4. Workflow ID Display Fix

**Problem:** Workflow ID (e.g., "CE2") was appearing twice - once in grey and duplicated in the workflow name.

**Root Cause:**
- `name` field stored as `"CE2. Workflow Name"` (with ID prefix)
- Display showed `w.id` separately plus the full `w.name`

**Fix:** Store workflow name WITHOUT ID prefix:

```javascript
// Before (WRONG)
name: `${workflowId}. ${workflowName}`

// After (CORRECT)
name: workflowName  // ID stored separately in w.id
```

**Display:**
```javascript
<span style="color: #888;">${w.id}.</span> ${w.name || ''}
```

Result: `CE2. Concessions Waste Minimization` with "CE2." in grey, rest in white.

---

### 5. Augusta Labs Branding

**Implemented:** "Augusta Labs" always appears in bottom right of angle card preview.

```html
<div style="display: flex; justify-content: space-between; align-items: center;">
  <p style="color: #4ade80;">✓ Case Mentioned in Introduction Call...</p>
  <p style="color: #888;">Augusta Labs</p>
</div>
```

---

### 6. Fallback Template Pools (Pre-measured 70-85 chars)

All fallback bullet templates have been pre-measured to be within 70-85 characters:

**Challenges Pool (10 bullets):**
```javascript
const challengePool = [
  `Manual entry and reconciliation across fragmented systems drives delays and accuracy gaps.`, // 84
  `Limited visibility into operational drivers during close cycles delays executive reporting.`, // 85
  `Fragmented data sources and inconsistent metric definitions complicate decision-making.`, // 83
  // ... etc
];
```

**Solutions Pool (12 bullets):**
```javascript
const solutionPool = [
  `Automate extraction, validation, classification, and posting to core finance systems.`, // 81
  `Route only low-confidence exceptions to analysts, processing 90%+ straight-through.`, // 80
  // ... etc
];
```

**Impacts Pool (10 bullets):**
```javascript
const impactPool = [
  `Accelerate cycle times by 2-3 days via automated processing and intelligent routing.`, // 82
  `Reduce errors by 90% and eliminate low-value manual rework that drains analyst time.`, // 82
  // ... etc
];
```

---

### 7. Prompt Updates

**System Prompt (`server.js`):**
```
CHARACTER LIMITS (CRITICAL - STRICT ENFORCEMENT):
- ALL bullets MUST be between 70-85 characters (NEVER below 70, NEVER above 85)
- Challenge bullets: EXACTLY 70-85 chars - count carefully
- Solution bullets: EXACTLY 70-85 chars - count carefully
- Impact bullets: EXACTLY 70-85 chars - count carefully
- If a bullet is under 70 chars, add more specific detail to reach 70+
- If a bullet exceeds 85 chars, trim it down - this is a HARD limit
```

**Angle Card Prompt:**
```
STRICT CHARACTER LIMITS (HARD REQUIREMENT - COUNT CAREFULLY):
- Each challenge bullet: EXACTLY 70-85 characters (NEVER below 70, NEVER above 85)
- Each solution bullet: EXACTLY 70-85 characters (NEVER below 70, NEVER above 85)
- Each impact bullet: EXACTLY 70-85 characters (NEVER below 70, NEVER above 85)
- COUNT EVERY CHARACTER before returning - bullets outside 70-85 range will be REJECTED
```

**Heatmap Prompt:**
```
STRICT CHARACTER LIMITS (COUNT CAREFULLY):
- painPoint: EXACTLY 50-80 characters (NEVER exceed 80)
- solution: EXACTLY 70-100 characters (NEVER exceed 100)
- name: max 50 characters
- If over limit, trim words - this is a HARD limit
```

---

## File Changes Summary

### Modified Files

| File | Changes |
|------|---------|
| `server.js` | Added `.edn` MIME type, strict character enforcement in all API endpoints |
| `index.html` | Canonical template loading, heatmap editing, character enforcement, display fixes |
| `CLAUDE.md` | Updated character limits documentation |

### Key Functions Added

| Function | Purpose |
|----------|---------|
| `loadCanonicalTemplates()` | Fetch .edn templates on page load |
| `editHeatmapCell()` | Open modal to edit heatmap cell |
| `saveHeatmapEdit()` | Save edited cell content |
| `enforceBulletMax()` | Truncate text to 85 chars max |
| `getCharCountClass()` | CSS class for character count indicator |

---

## Hard Character Limit Enforcement (ABSOLUTE LIMITS)

**Problem:** AI prompts alone cannot guarantee character limits - models sometimes exceed them.

**Solution:** Multi-layer hard enforcement using `hardTruncate()` function:

```javascript
function hardTruncate(text, max) {
  if (!text) return text;
  text = String(text).trim();
  if (text.length <= max) return text;
  let cut = text.lastIndexOf(' ', max);
  if (cut < max * 0.5) cut = max;
  return text.substring(0, cut).trim();
}
```

**Enforcement Points (P&L Heatmap):**

| Location | Applied To |
|----------|------------|
| Server: `handleGenerateHeatmap` | All workflow fields + title |
| Server: `handleGenerateTitles` | All 5 titles |
| Client: API response processing | All workflow fields + titles |
| Client: `generateMockHeatmap` | All fallback content |
| Client: `generateHeatmapEdn` | Final EDN output (safety net) |

**ABSOLUTE P&L Limits:**
- Pain Point: **48 chars** max
- Solution: **114 chars** max
- Workflow name: **46 chars** max
- Title: **84 chars** max

---

## Testing Checklist

- [ ] Templates load correctly from `prompts/templates/`
- [ ] Heatmap cells are editable (click to edit)
- [ ] Character count displays correctly
- [ ] P&L Pain Points never exceed 48 characters
- [ ] P&L Solutions never exceed 114 characters
- [ ] P&L Workflow names never exceed 46 characters
- [ ] P&L Titles never exceed 84 characters
- [ ] Workflow ID appears once (grey) not duplicated
- [ ] Augusta Labs branding appears in bottom right
- [ ] API generates content within character limits
- [ ] EDN export respects character limits

---

## Commands

```bash
# Start development server
npm start
# or
npm run dev

# Server runs on http://localhost:3001
```

---

## Architecture

```
P&L Automation/
├── server.js              # HTTP server + API endpoints
├── index.html             # Web UI (single-page app)
├── examples.js            # Legacy example data
├── prompts/
│   ├── templates/         # Canonical EDN templates
│   │   ├── heatmap_pnl_canonical.edn
│   │   ├── heatmap_pnl_simple_canonical.edn
│   │   ├── angle_cards_double_canonical.edn
│   │   └── angle_cards_triple_canonical.edn
│   └── gemini-edn-generation.md
├── automation-tests/
│   └── edn-editor.js      # EDN text replacement utilities
├── CLAUDE.md              # Project documentation
└── PROGRESS.md            # This file
```
