# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Value Creation Slides Generator - A Node.js application that generates McKinsey-style consulting slides for Pitch.com presentations. The system uses OpenAI's API to generate content and can output Pitch.com EDN format with Playwright automation scripts.

## Commands

```bash
# Start the development server (runs on port 3001)
npm start
# or
npm run dev
```

## Architecture

### Core Files

- **server.js** - HTTP server with OpenAI API integration. Serves the web UI and handles API endpoints:
  - `POST /api/generate-heatmap` - Generate P&L Impact Heatmap content
  - `POST /api/generate-angle-card` - Generate detailed workflow angle cards
  - `POST /api/generate-titles` - Generate McKinsey-style slide titles
  - `POST /api/regenerate-content` - Regenerate specific workflow content with feedback
  - `POST /api/modify-edn` - Programmatic EDN text replacement (uses edn-editor.js)
  - `GET /api/status` - Health check / API configuration status

- **slide-generator.js** - Core slide generation logic with:
  - `SlideGenerator` class for managing context and generating prompts
  - Content validation against character limits (heatmap vs angle card limits)
  - EDN format utilities for Pitch.com output
  - Domain templates for different heatmap versions (P&L, Company Domains, Vertical)
  - Playwright automation script generator

- **examples.js** - Example EDN templates for heatmap and angle card slides

- **index.html** - Web UI for the slide generator

### Slide Types

1. **Heatmap Slide** - 14-17 workflow rows organized into 7-9 domains, showing pain points and AI solutions
2. **Angle Card Slides** - Detailed workflow cards with Challenges (3), Solutions (5), and Impact (3) bullets

### Domain Templates

- **Version 1 (P&L)**: Planning & Forecasting, Capital Allocation, Revenue & Margin, Cost Execution, Working Capital, Performance & Governance, Decision Support, Data Architecture
- **Version 2 (Company Domains)**: Industry-specific (e.g., Banking: Lending, Deposits, Payments, Risk)
- **Version 3 (Vertical)**: Functional departments (e.g., Finance: FP&A, Treasury, Accounting, Tax)

### Character Limits (STRICT ENFORCEMENT - Based on Pitch.com Template Capacity)

**P&L Heatmap Slide:**
- Title: **MAX 85 chars** (e.g., "Airline P&L impact comes from industrializing finance control and execution")
- Domain: max 25 chars
- Workflow name: **MAX 47 chars** (e.g., "WC2. Asset Accountability & Replenishment Logic")
- Pain Point: **MAX 48 chars** (e.g., "Forecasts distorted by disruptions & crew costs.")
- Agentic Solution: **MAX 114 chars** (e.g., "Connect SAP with operational airline systems for a single source of truth for forecasting, costing, and reporting.")

**Angle Card Slides:**
- Title: 70-85 chars
- Workflow Title: max 45 chars
- Subtitle: max 60 chars
- Challenge bullets: **EXACTLY 70-85 chars** (STRICT - never below 70, never above 85)
- Solution bullets: **EXACTLY 70-85 chars** (STRICT - never below 70, never above 85)
- Impact bullets: **EXACTLY 70-85 chars** (STRICT - never below 70, never above 85)

All bullets in the same section should have similar character counts. The server enforces these limits by truncating any content that exceeds them.

### EDN Text Replacement

When modifying slides, ONLY change text content - never modify the EDN structure. Use the provided utilities:
- `replaceEdnText(edn, oldText, newText)` - Replace any text
- `replaceEdnTextMultiple(edn, {old: new, ...})` - Replace multiple texts
- `replaceHeatmapCell(edn, oldContent, newContent)` - Replace table cells
- `replaceWorkflowTitle(edn, oldTitle, newTitle)` - Replace workflow titles
- `replaceIcon(edn, oldIcon, newIcon)` - Replace icons
- `validateEdnStructure(original, modified)` - Validate structure preserved

## Environment

Requires `OPENAI_API_KEY` in `.env` file. The server uses GPT model for content generation.

## Pitch.com Integration

### EDN Format

Pitch.com uses EDN (Extensible Data Notation) as its internal data format. The workflow for creating slides is:

1. Copy an existing slide from Pitch.com (using Cmd+C) - this copies EDN to clipboard
2. Programmatically modify the EDN text content using `edn-editor.js`
3. Paste the modified EDN back into Pitch.com (using Cmd+V)

**CRITICAL**: Only modify text content in the EDN. The structure (UUIDs, coordinates, formatting) MUST remain unchanged or the paste will fail.

### EDN Editor Module

See `/automation-tests/edn-editor.js` for programmatic EDN text replacement:

```javascript
const ednEditor = require('./automation-tests/edn-editor');

// Replace text while preserving structure
const newEdn = ednEditor.replaceText(templateEdn, 'old text', 'new text');

// Replace table cells (for heatmaps)
const newEdn = ednEditor.replaceTableCell(edn, 'Old Cell', 'New Cell');

// Validate structure is preserved
const validation = ednEditor.validateStructure(original, modified);
```

### Web App Workflow

1. Generate content at `localhost:3001`
2. Copy template slide EDN from Pitch.com
3. Use EDN editor to replace text programmatically
4. Paste modified EDN back into Pitch.com

## Style Guidelines

Content follows McKinsey Partner style:
- Sharp, concise, P&L-driven - every word earns its place
- Quantified impacts with conservative ranges (10-15%, 20-30%, 2-3x) - don't make vague claims
- Action verbs: Ingest, Automate, Simulate, Extract, Connect, Attribute, Forecast
- Specific to company/industry context
- Titles use format: "[Outcome] comes from [action/approach]"

**AI/ML Mentions:**
- Only mention where it genuinely adds value
- Do NOT say "agentic" - use "AI" or "ML"
- Focus on business outcome, not technology
