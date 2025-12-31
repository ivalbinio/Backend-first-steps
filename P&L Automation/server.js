/**
 * Development server for AI Value Creation Slides Generator
 * With OpenAI API integration for content generation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const ednEditor = require('./automation-tests/edn-editor');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const PORT = 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.edn': 'text/plain'
};

// System prompt for McKinsey-style content generation
const SYSTEM_PROMPT = `You are a McKinsey Partner writing high-impact consulting slides for C-suite executives.

STYLE MANDATE:
- Sharp, concise, exhaustive - every word earns its place
- Quantify impact with conservative ranges (10-15%, 20-30%, 2-3x) - don't make vague random claims
- Use active voice and action verbs (Ingest, Automate, Simulate, Extract, Connect, Attribute, Forecast)
- No fluff, no filler, no generic statements
- Content must be SPECIFIC to the company, industry, and audience
- P&L-driven and highly relevant for the specific audience role

CHARACTER LIMITS (CRITICAL - STRICT ENFORCEMENT):
- ALL bullets MUST be between 70-85 characters (NEVER below 70, NEVER above 85)
- Challenge bullets: EXACTLY 70-85 chars - count carefully
- Solution bullets: EXACTLY 70-85 chars - count carefully
- Impact bullets: EXACTLY 70-85 chars - count carefully
- If a bullet is under 70 chars, add more specific detail to reach 70+
- If a bullet exceeds 85 chars, trim it down - this is a HARD limit
- All bullets in the same section should have SIMILAR character counts

AI/ML MENTIONS:
- Only mention AI/ML where it genuinely adds value
- Do NOT say "agentic" - use "AI" or "ML" instead
- Do NOT overdo AI mentions - be subtle and natural
- Focus on the business outcome, not the technology

OUTPUT FORMAT:
Return ONLY valid JSON with no markdown formatting, no code blocks, no explanation.`;

async function callOpenAI(prompt, systemPrompt = SYSTEM_PROMPT) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in .env file');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_completion_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function handleGenerateAngleCard(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { context, workflows, cardIndex, totalCards } = JSON.parse(body);

      const workflowNames = workflows.map(w => w.name).join(' + ');
      const workflowDomains = [...new Set(workflows.map(w => w.domain))].join(' and ');

      const prompt = `Generate an angle card for a ${context.industry} company called "${context.company}".

AUDIENCE: ${context.audience.name} (${context.audience.title})
KEY CONCERNS: ${context.audience.concerns}
${context.additionalContext ? `ADDITIONAL CONTEXT: ${context.additionalContext}` : ''}

WORKFLOWS TO COVER:
${workflows.map(w => `- ${w.name}: Current pain point is "${w.painPoint}"`).join('\n')}

CARD CONTEXT: This is card ${cardIndex + 1} of ${totalCards}, focusing on ${workflowDomains}.

Generate content that:
1. Creates a compelling title connecting these workflows to ${context.audience.name}'s priorities
2. For EACH workflow, provide:
   - A subtitle specific to how this helps ${context.audience.title}s (max 60 chars)
   - 3 UNIQUE challenges (specific to ${context.company} and ${context.industry}, not generic)
   - 5 concrete solutions with specific actions
   - 3 quantified impacts (with realistic % or time savings)

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: CHARACTER LIMIT ENFORCEMENT (ABSOLUTE REQUIREMENT)
═══════════════════════════════════════════════════════════════════════════════

EVERY bullet (challenges, solutions, impacts) MUST be between 70-85 characters.

GOOD EXAMPLES (copy this length):
✓ "Manual reconciliation across fragmented systems creates delays and accuracy gaps." (81 chars)
✓ "Automate extraction and validation to reduce manual processing time by 60-70%." (79 chars)
✓ "Accelerate cycle times by 2-3 days through automated processing and routing." (77 chars)

BAD EXAMPLES (DO NOT DO THIS):
✗ "Manual data entry is slow." (26 chars - TOO SHORT, add specific details)
✗ "Implementing automated systems that integrate with existing infrastructure while maintaining compliance and reducing operational overhead." (138 chars - TOO LONG, cut words)

BEFORE RETURNING EACH BULLET:
1. Count the characters (including spaces and punctuation)
2. If < 70: Add specifics like "${context.company}", percentages, or action verbs
3. If > 85: Remove adjectives, shorten phrases (e.g., "in order to" → "to")
4. Verify final count is 70-85

Do NOT use bold formatting (**text**) in bullets.
═══════════════════════════════════════════════════════════════════════════════

Return this exact JSON structure:
{
  "title": "string - compelling headline connecting workflows to audience priorities",
  "workflows": [
    {
      "id": "workflow ID",
      "subtitle": "string - how this workflow addresses ${context.audience.name}'s concerns",
      "challenges": ["70-85 chars each", "70-85 chars each", "70-85 chars each"],
      "solutions": ["70-85 chars each", "70-85 chars each", "70-85 chars each", "70-85 chars each", "70-85 chars each"],
      "impacts": ["70-85 chars each with %", "70-85 chars each", "70-85 chars each"]
    }
  ]
}`;

      const result = await callOpenAI(prompt);

      // Parse the JSON response (handle potential markdown wrapping)
      let parsed;
      try {
        // Remove markdown code blocks if present
        let cleanResult = result.trim();
        if (cleanResult.startsWith('```json')) {
          cleanResult = cleanResult.slice(7);
        } else if (cleanResult.startsWith('```')) {
          cleanResult = cleanResult.slice(3);
        }
        if (cleanResult.endsWith('```')) {
          cleanResult = cleanResult.slice(0, -3);
        }
        parsed = JSON.parse(cleanResult.trim());
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', result);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // STRICT ENFORCEMENT: Truncate any bullet exceeding 85 chars for angle cards
      const MAX_CHARS = 85;

      function enforceLimit(text) {
        if (!text) return text;
        text = text.trim();
        if (text.length <= MAX_CHARS) return text;
        // Truncate - leave room for period if needed
        let cut = text.lastIndexOf(' ', MAX_CHARS - 2);
        if (cut < 50) cut = MAX_CHARS - 2;
        let result = text.substring(0, cut).trim();
        // Only add period if doesn't end with punctuation
        if (!/[.!?]$/.test(result)) result += '.';
        // Final safety check - hard truncate if still over
        if (result.length > MAX_CHARS) {
          result = result.substring(0, MAX_CHARS - 1) + '.';
        }
        return result;
      }

      if (parsed.workflows) {
        parsed.workflows = parsed.workflows.map(w => ({
          ...w,
          challenges: (w.challenges || []).map(enforceLimit),
          solutions: (w.solutions || []).map(enforceLimit),
          impacts: (w.impacts || []).map(enforceLimit)
        }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: parsed }));

    } catch (error) {
      console.error('Error generating angle card:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

async function handleGenerateHeatmap(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { context, domains } = JSON.parse(body);

      const prompt = `Generate a P&L Impact Heatmap for ${context.company}, a ${context.industry} company.

AUDIENCE: ${context.audience.name} (${context.audience.title})
KEY CONCERNS: ${context.audience.concerns}
${context.additionalContext ? `ADDITIONAL CONTEXT: ${context.additionalContext}` : ''}

DOMAINS TO COVER (generate 2 workflows per domain):
${domains.map(d => `- ${d.name} (${d.abbr})`).join('\n')}

For each domain, generate 2 high-ROI agentic workflows that would resonate with a ${context.audience.title}.

REQUIREMENTS:
- Workflow names must be specific and actionable (e.g., "Automated Invoice Reconciliation", not "Process Improvement")
- Pain points must be quantified where possible (e.g., "5-7 day cycle time", "15% error rate")
- Solutions must describe AI/automation capabilities with specific outcomes
- Everything must be tailored to ${context.industry} and ${context.company}

STRICT CHARACTER LIMITS (COUNT CAREFULLY - HARD LIMITS):
- painPoint: MAX 48 characters (NEVER exceed 48)
- solution: MAX 114 characters (NEVER exceed 114)
- name: MAX 47 characters (NEVER exceed 47)
- title: MAX 85 characters (NEVER exceed 85)
- If over limit, trim words - this is a HARD limit

Return this exact JSON structure:
{
  "title": "string - compelling headline for the heatmap (e.g., '${context.industry} P&L impact comes from industrializing finance control')",
  "workflows": [
    {
      "id": "XX1",
      "domain": "Domain Name",
      "name": "Specific Workflow Name (max 47 chars)",
      "painPoint": "max 48 chars",
      "solution": "max 114 chars"
    }
  ]
}

Generate exactly ${domains.length * 2} workflows (2 per domain).`;

      const result = await callOpenAI(prompt);

      let parsed;
      try {
        let cleanResult = result.trim();
        if (cleanResult.startsWith('```json')) cleanResult = cleanResult.slice(7);
        else if (cleanResult.startsWith('```')) cleanResult = cleanResult.slice(3);
        if (cleanResult.endsWith('```')) cleanResult = cleanResult.slice(0, -3);
        parsed = JSON.parse(cleanResult.trim());
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', result);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // ABSOLUTE HARD LIMITS - These CANNOT be exceeded (based on Pitch.com template capacity)
      const PAIN_MAX = 48;      // "Forecasts distorted by disruptions & crew costs."
      const SOLUTION_MAX = 114; // "Connect SAP with operational airline systems for a single source of truth..."
      const NAME_MAX = 46;      // 1 less than "WC2. Asset Accountability & Replenishment Logic"
      const TITLE_MAX = 84;     // 1 less than original max

      // HARD TRUNCATE - absolutely guarantees max length, no exceptions
      function hardTruncate(text, max) {
        if (!text) return text;
        text = String(text).trim();
        if (text.length <= max) return text;
        // Hard cut at max, then find last space to avoid mid-word cut
        let cut = text.lastIndexOf(' ', max);
        if (cut < max * 0.5) cut = max; // If no good break point, just hard cut
        return text.substring(0, cut).trim();
      }

      // Enforce title limit - HARD
      if (parsed.title) {
        parsed.title = hardTruncate(parsed.title, TITLE_MAX);
      }

      // Enforce all workflow field limits - HARD
      if (parsed.workflows) {
        parsed.workflows = parsed.workflows.map(w => ({
          ...w,
          name: hardTruncate(w.name, NAME_MAX),
          painPoint: hardTruncate(w.painPoint, PAIN_MAX),
          solution: hardTruncate(w.solution, SOLUTION_MAX)
        }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: parsed }));

    } catch (error) {
      console.error('Error generating heatmap:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

async function handleGenerateTitles(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { context, workflowCount } = JSON.parse(body);

      const TITLE_MAX = 84; // ABSOLUTE LIMIT (1 less than original)

      const prompt = `Generate 5 compelling slide titles for a P&L Impact Heatmap presentation.

COMPANY: ${context.company}
INDUSTRY: ${context.industry}
AUDIENCE: ${context.audience.name} (${context.audience.title})
CONCERNS: ${context.audience.concerns}
WORKFLOWS: ${workflowCount} high-ROI agentic workflows

Generate 5 different title options that:
- Are McKinsey Partner style (sharp, concise, impactful)
- Connect AI/automation to P&L impact
- Resonate with ${context.audience.title}s
- Are specific to ${context.industry}
- MUST be MAX ${TITLE_MAX} characters each (HARD LIMIT - count carefully)

Return as JSON:
{
  "titles": ["max ${TITLE_MAX} chars", "max ${TITLE_MAX} chars", "max ${TITLE_MAX} chars", "max ${TITLE_MAX} chars", "max ${TITLE_MAX} chars"]
}`;

      const result = await callOpenAI(prompt);

      let parsed;
      try {
        let cleanResult = result.trim();
        if (cleanResult.startsWith('```json')) cleanResult = cleanResult.slice(7);
        else if (cleanResult.startsWith('```')) cleanResult = cleanResult.slice(3);
        if (cleanResult.endsWith('```')) cleanResult = cleanResult.slice(0, -3);
        parsed = JSON.parse(cleanResult.trim());
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', result);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // HARD TRUNCATE all titles - no exceptions
      if (parsed.titles) {
        parsed.titles = parsed.titles.map(t => {
          if (!t || t.length <= TITLE_MAX) return t;
          let cut = t.lastIndexOf(' ', TITLE_MAX);
          if (cut < TITLE_MAX * 0.5) cut = TITLE_MAX;
          return t.substring(0, cut).trim();
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: parsed }));

    } catch (error) {
      console.error('Error generating titles:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

async function handleGenerateAngleCardTitles(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { context, angleCards } = JSON.parse(body);

      // Generate titles for each angle card
      const allTitles = [];

      for (let i = 0; i < angleCards.length; i++) {
        const card = angleCards[i];
        const workflowNames = card.workflows.map(w => w.name || w.id).join(' + ');
        const domains = [...new Set(card.workflows.map(w => w.domain))].join(' & ');

        const prompt = `Generate 5 compelling slide titles for an angle card in a P&L Impact presentation.

COMPANY: ${context.company}
INDUSTRY: ${context.industry}
AUDIENCE: ${context.audience.name} (${context.audience.title})
CONCERNS: ${context.audience.concerns}

CARD ${i + 1} WORKFLOWS: ${workflowNames}
DOMAINS: ${domains}

Generate 5 different title options that:
- Are McKinsey Partner style (sharp, concise, impactful)
- Connect AI/automation to measurable P&L outcomes
- Resonate with ${context.audience.title}s
- Reference the specific domains: ${domains}
- Maximum 90 characters each

Return as JSON:
{
  "titles": ["title1", "title2", "title3", "title4", "title5"]
}`;

        const result = await callOpenAI(prompt);

        let parsed;
        try {
          let cleanResult = result.trim();
          if (cleanResult.startsWith('```json')) cleanResult = cleanResult.slice(7);
          else if (cleanResult.startsWith('```')) cleanResult = cleanResult.slice(3);
          if (cleanResult.endsWith('```')) cleanResult = cleanResult.slice(0, -3);
          parsed = JSON.parse(cleanResult.trim());
        } catch (parseError) {
          console.error('Failed to parse OpenAI response for card', i, ':', result);
          // Fallback titles
          parsed = {
            titles: [
              `${domains} excellence drives ${context.industry.toLowerCase()} P&L performance`,
              `High-performing ${context.industry.toLowerCase()} organizations excel through ${domains.toLowerCase()} integration`,
              `${context.company} margin expansion requires ${domains.toLowerCase()} automation`,
              `AI-enabled ${domains.toLowerCase()} creates durable competitive advantage`,
              `${domains} transformation accelerates ${context.industry.toLowerCase()} value creation`
            ]
          };
        }

        allTitles.push({
          cardIndex: i,
          workflows: workflowNames,
          domains: domains,
          titles: parsed.titles,
          selectedIndex: 0
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { cards: allTitles } }));

    } catch (error) {
      console.error('Error generating angle card titles:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

async function handleRegenerateContent(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { context, workflow, currentContent, feedback } = JSON.parse(body);

      const prompt = `Regenerate content for an angle card workflow.

COMPANY: ${context.company} (${context.industry})
AUDIENCE: ${context.audience.name} (${context.audience.title})
CONCERNS: ${context.audience.concerns}

WORKFLOW: ${workflow.name}
DOMAIN: ${workflow.domain}
PAIN POINT: ${workflow.painPoint}

${feedback ? `USER FEEDBACK: "${feedback}" - incorporate this specific feedback.` : 'Generate completely fresh content, different from before.'}

${currentContent ? `CURRENT CONTENT (generate something DIFFERENT):
- Challenges: ${currentContent.challenges?.join(', ')}
- Solutions: ${currentContent.solutions?.join(', ')}` : ''}

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: CHARACTER LIMIT ENFORCEMENT (ABSOLUTE REQUIREMENT)
═══════════════════════════════════════════════════════════════════════════════

EVERY bullet MUST be between 70-85 characters. No exceptions.

GOOD EXAMPLES (match this length):
✓ "Manual reconciliation across fragmented systems creates delays and accuracy gaps." (81 chars)
✓ "Automate extraction and validation to reduce manual processing time by 60-70%." (79 chars)

BEFORE RETURNING EACH BULLET:
1. Count characters (spaces + punctuation included)
2. If < 70: Add "${context.company}", percentages, or action verbs
3. If > 85: Remove adjectives, shorten phrases
4. Verify 70-85 range

Do NOT use bold formatting (**text**).
═══════════════════════════════════════════════════════════════════════════════

Return this exact JSON structure:
{
  "subtitle": "string - specific to ${context.audience.title}'s needs (max 60 chars)",
  "challenges": ["70-85 chars", "70-85 chars", "70-85 chars"],
  "solutions": ["70-85 chars", "70-85 chars", "70-85 chars", "70-85 chars", "70-85 chars"],
  "impacts": ["70-85 chars with %", "70-85 chars", "70-85 chars"]
}`;

      const result = await callOpenAI(prompt);

      let parsed;
      try {
        let cleanResult = result.trim();
        if (cleanResult.startsWith('```json')) cleanResult = cleanResult.slice(7);
        else if (cleanResult.startsWith('```')) cleanResult = cleanResult.slice(3);
        if (cleanResult.endsWith('```')) cleanResult = cleanResult.slice(0, -3);
        parsed = JSON.parse(cleanResult.trim());
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', result);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // STRICT ENFORCEMENT: Truncate any bullet exceeding 85 chars
      const MAX_CHARS = 85;
      function enforceLimit(text) {
        if (!text) return text;
        text = text.trim();
        if (text.length <= MAX_CHARS) return text;
        let cut = text.lastIndexOf(' ', MAX_CHARS - 2);
        if (cut < 50) cut = MAX_CHARS - 2;
        let result = text.substring(0, cut).trim();
        if (!/[.!?]$/.test(result)) result += '.';
        // Final safety check
        if (result.length > MAX_CHARS) {
          result = result.substring(0, MAX_CHARS - 1) + '.';
        }
        return result;
      }

      if (parsed.challenges) parsed.challenges = parsed.challenges.map(enforceLimit);
      if (parsed.solutions) parsed.solutions = parsed.solutions.map(enforceLimit);
      if (parsed.impacts) parsed.impacts = parsed.impacts.map(enforceLimit);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: parsed }));

    } catch (error) {
      console.error('Error regenerating content:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

/**
 * Handle EDN text modification
 * Allows programmatic text replacement while preserving EDN structure
 */
async function handleModifyEdn(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { edn, replacements, type } = JSON.parse(body);

      if (!edn || !replacements) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing edn or replacements' }));
        return;
      }

      let modifiedEdn = edn;

      // Apply replacements based on type
      if (type === 'heatmap') {
        // For heatmaps, use table cell replacement
        modifiedEdn = ednEditor.generateHeatmapEdn(edn, replacements);
      } else if (type === 'angle_card') {
        // For angle cards, use angle card replacement
        modifiedEdn = ednEditor.generateAngleCardEdn(edn, replacements);
      } else {
        // Generic text replacement
        if (Array.isArray(replacements)) {
          for (const { oldText, newText } of replacements) {
            modifiedEdn = ednEditor.replaceText(modifiedEdn, oldText, newText);
          }
        } else if (typeof replacements === 'object') {
          modifiedEdn = ednEditor.replaceMultiple(modifiedEdn, replacements);
        }
      }

      // Validate structure
      const validation = ednEditor.validateStructure(edn, modifiedEdn);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        edn: modifiedEdn,
        validation
      }));

    } catch (error) {
      console.error('Error modifying EDN:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers for API requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoints
  if (req.method === 'POST' && req.url === '/api/generate-heatmap') {
    return handleGenerateHeatmap(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/generate-titles') {
    return handleGenerateTitles(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/generate-angle-card') {
    return handleGenerateAngleCard(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/generate-angle-card-titles') {
    return handleGenerateAngleCardTitles(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/regenerate-content') {
    return handleRegenerateContent(req, res);
  }

  // EDN text replacement API
  if (req.method === 'POST' && req.url === '/api/modify-edn') {
    return handleModifyEdn(req, res);
  }

  // Health check / API status
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      openaiConfigured: !!OPENAI_API_KEY,
      model: 'gpt-5.2'
    }));
    return;
  }

  // Static file serving
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  AI Value Creation Slides Generator                        ║
║  Server running at: http://localhost:${PORT}                  ║
║                                                            ║
║  OpenAI API: ${OPENAI_API_KEY ? '✓ Configured (gpt-5.2)' : '✗ Not configured'}             ║
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
  `);
});
