/**
 * EDN Text Editor for Pitch.com Slides
 *
 * This module provides programmatic text replacement in Pitch.com EDN format.
 * CRITICAL: Only text content is modified. The EDN structure MUST remain unchanged.
 *
 * Usage:
 * 1. Load an EDN template from examples.js
 * 2. Use replaceText() to swap text content
 * 3. Copy the modified EDN to clipboard
 * 4. Paste into Pitch.com (Cmd+V)
 */

/**
 * Escape text for EDN/HTML context
 */
function escapeEdnText(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '\\"');
}

/**
 * Unescape text from EDN/HTML context
 */
function unescapeEdnText(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/\\"/g, '"');
}

/**
 * Replace text in EDN while preserving structure.
 * This is the core function - it does simple string replacement.
 *
 * @param {string} edn - The EDN string
 * @param {string} oldText - Text to find (will be escaped for EDN)
 * @param {string} newText - Replacement text (will be escaped for EDN)
 * @returns {string} - Modified EDN
 */
function replaceText(edn, oldText, newText) {
  const escapedOld = escapeEdnText(oldText);
  const escapedNew = escapeEdnText(newText);
  return edn.split(escapedOld).join(escapedNew);
}

/**
 * Replace multiple texts at once
 *
 * @param {string} edn - The EDN string
 * @param {Object} replacements - { oldText: newText, ... }
 * @returns {string} - Modified EDN
 */
function replaceMultiple(edn, replacements) {
  let result = edn;
  for (const [oldText, newText] of Object.entries(replacements)) {
    result = replaceText(result, oldText, newText);
  }
  return result;
}

/**
 * Replace the main slide title
 *
 * @param {string} edn - The EDN string
 * @param {string} oldTitle - Current title
 * @param {string} newTitle - New title
 * @returns {string} - Modified EDN
 */
function replaceSlideTitle(edn, oldTitle, newTitle) {
  return replaceText(edn, oldTitle, newTitle);
}

/**
 * Replace a table cell in heatmap EDN
 * Table cells are wrapped in <p> tags
 *
 * @param {string} edn - The EDN string
 * @param {string} oldContent - Current cell content
 * @param {string} newContent - New cell content
 * @returns {string} - Modified EDN
 */
function replaceTableCell(edn, oldContent, newContent) {
  // Table cells are stored as "<p>content</p>"
  const oldCell = `<p>${escapeEdnText(oldContent)}</p>`;
  const newCell = `<p>${escapeEdnText(newContent)}</p>`;
  return edn.split(oldCell).join(newCell);
}

/**
 * Replace a bullet point in angle card EDN
 * Bullets are in <li><p>content</p></li> format
 *
 * @param {string} edn - The EDN string
 * @param {string} oldBullet - Current bullet text
 * @param {string} newBullet - New bullet text
 * @returns {string} - Modified EDN
 */
function replaceBullet(edn, oldBullet, newBullet) {
  return replaceText(edn, oldBullet, newBullet);
}

/**
 * Replace workflow title (typically in italic/bold format)
 *
 * @param {string} edn - The EDN string
 * @param {string} oldTitle - Current workflow title
 * @param {string} newTitle - New workflow title
 * @returns {string} - Modified EDN
 */
function replaceWorkflowTitle(edn, oldTitle, newTitle) {
  return replaceText(edn, oldTitle, newTitle);
}

/**
 * Replace icon URL
 *
 * @param {string} edn - The EDN string
 * @param {string} oldIcon - Current icon path (e.g., "Material-Outlined/widgets.svg")
 * @param {string} newIcon - New icon path
 * @returns {string} - Modified EDN
 */
function replaceIcon(edn, oldIcon, newIcon) {
  const baseUrl = 'https://icon-sets.static.services.pitch.com/icon-sets/';
  return edn.split(baseUrl + oldIcon).join(baseUrl + newIcon);
}

/**
 * Extract all text content from EDN for analysis/preview
 *
 * @param {string} edn - The EDN string
 * @returns {Object} - Extracted content
 */
function extractTextContent(edn) {
  const result = {
    titles: [],
    paragraphs: [],
    bullets: [],
    tableCells: []
  };

  // Extract body content from :body fields
  const bodyRegex = /:body\s+"((?:[^"\\]|\\.)*)"/g;
  let match;

  while ((match = bodyRegex.exec(edn)) !== null) {
    const content = match[1];
    // Parse HTML content
    const text = content
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (text) {
      if (content.includes('<li>')) {
        result.bullets.push(text);
      } else if (content.includes('font-weight:700') || content.includes('font-weight:500')) {
        result.titles.push(text);
      } else {
        result.paragraphs.push(text);
      }
    }
  }

  // Extract table data
  const tableDataRegex = /:table-data\s+\[((?:[^\]]+|\[(?:[^\]]+|\[[^\]]*\])*\])*)\]/;
  const tableMatch = edn.match(tableDataRegex);
  if (tableMatch) {
    const cellRegex = /<p>([^<]*)<\/p>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(tableMatch[1])) !== null) {
      const cellText = cellMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .trim();
      if (cellText) {
        result.tableCells.push(cellText);
      }
    }
  }

  return result;
}

/**
 * Validate that EDN structure is preserved after modifications
 *
 * @param {string} original - Original EDN
 * @param {string} modified - Modified EDN
 * @returns {Object} - Validation result
 */
function validateStructure(original, modified) {
  const errors = [];

  // Check key structural patterns are preserved
  const patterns = [
    ':format :pointed-dict',
    ':entity-type :block',
    ':block-type :text',
    ':block-type :shape',
    ':block-type :image',
    ':block-type :table',
    ':coords',
    '#uuid'
  ];

  for (const pattern of patterns) {
    const origCount = (original.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const modCount = (modified.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

    if (origCount !== modCount) {
      errors.push(`Pattern '${pattern}' count changed: ${origCount} -> ${modCount}`);
    }
  }

  // Check bracket balance
  const openCurly = (modified.match(/\{/g) || []).length;
  const closeCurly = (modified.match(/\}/g) || []).length;
  if (openCurly !== closeCurly) {
    errors.push(`Curly brace mismatch: { = ${openCurly}, } = ${closeCurly}`);
  }

  const openSquare = (modified.match(/\[/g) || []).length;
  const closeSquare = (modified.match(/\]/g) || []).length;
  if (openSquare !== closeSquare) {
    errors.push(`Square bracket mismatch: [ = ${openSquare}, ] = ${closeSquare}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate a modified heatmap EDN from template
 *
 * @param {string} templateEdn - Base EDN template
 * @param {Object} content - New content to apply
 * @returns {string} - Modified EDN
 */
function generateHeatmapEdn(templateEdn, content) {
  let edn = templateEdn;

  // Replace main title
  if (content.title && content.originalTitle) {
    edn = replaceSlideTitle(edn, content.originalTitle, content.title);
  }

  // Replace table cells (workflows)
  if (content.rows) {
    for (const row of content.rows) {
      if (row.originalWorkflow && row.workflow) {
        edn = replaceTableCell(edn, row.originalWorkflow, row.workflow);
      }
      if (row.originalPainPoint && row.painPoint) {
        edn = replaceTableCell(edn, row.originalPainPoint, row.painPoint);
      }
      if (row.originalSolution && row.solution) {
        edn = replaceTableCell(edn, row.originalSolution, row.solution);
      }
    }
  }

  // Replace footer
  if (content.footer && content.originalFooter) {
    edn = replaceText(edn, content.originalFooter, content.footer);
  }

  return edn;
}

/**
 * Generate a modified angle card EDN from template
 *
 * @param {string} templateEdn - Base EDN template
 * @param {Object} content - New content to apply
 * @returns {string} - Modified EDN
 */
function generateAngleCardEdn(templateEdn, content) {
  let edn = templateEdn;

  // Replace main title
  if (content.title && content.originalTitle) {
    edn = replaceSlideTitle(edn, content.originalTitle, content.title);
  }

  // Replace workflows
  if (content.workflows) {
    for (const workflow of content.workflows) {
      // Replace workflow title
      if (workflow.originalTitle && workflow.title) {
        edn = replaceWorkflowTitle(edn, workflow.originalTitle, workflow.title);
      }

      // Replace subtitle
      if (workflow.originalSubtitle && workflow.subtitle) {
        edn = replaceText(edn, workflow.originalSubtitle, workflow.subtitle);
      }

      // Replace challenges
      if (workflow.originalChallenges && workflow.challenges) {
        for (let i = 0; i < workflow.challenges.length && i < workflow.originalChallenges.length; i++) {
          edn = replaceBullet(edn, workflow.originalChallenges[i], workflow.challenges[i]);
        }
      }

      // Replace solutions
      if (workflow.originalSolutions && workflow.solutions) {
        for (let i = 0; i < workflow.solutions.length && i < workflow.originalSolutions.length; i++) {
          edn = replaceBullet(edn, workflow.originalSolutions[i], workflow.solutions[i]);
        }
      }

      // Replace impacts
      if (workflow.originalImpacts && workflow.impacts) {
        for (let i = 0; i < workflow.impacts.length && i < workflow.originalImpacts.length; i++) {
          edn = replaceBullet(edn, workflow.originalImpacts[i], workflow.impacts[i]);
        }
      }

      // Replace icon if specified
      if (workflow.originalIcon && workflow.icon) {
        edn = replaceIcon(edn, workflow.originalIcon, workflow.icon);
      }
    }
  }

  return edn;
}

// Export all functions
module.exports = {
  // Core functions
  escapeEdnText,
  unescapeEdnText,
  replaceText,
  replaceMultiple,

  // Specific replacements
  replaceSlideTitle,
  replaceTableCell,
  replaceBullet,
  replaceWorkflowTitle,
  replaceIcon,

  // Analysis
  extractTextContent,
  validateStructure,

  // High-level generators
  generateHeatmapEdn,
  generateAngleCardEdn
};

// CLI usage example
if (require.main === module) {
  console.log('EDN Editor for Pitch.com Slides');
  console.log('================================\n');
  console.log('Usage:');
  console.log('  const editor = require("./edn-editor");');
  console.log('  const newEdn = editor.replaceText(templateEdn, "old text", "new text");');
  console.log('\nFunctions:');
  console.log('  - replaceText(edn, old, new)');
  console.log('  - replaceMultiple(edn, {old: new, ...})');
  console.log('  - replaceSlideTitle(edn, old, new)');
  console.log('  - replaceTableCell(edn, old, new)');
  console.log('  - replaceBullet(edn, old, new)');
  console.log('  - replaceWorkflowTitle(edn, old, new)');
  console.log('  - replaceIcon(edn, oldPath, newPath)');
  console.log('  - extractTextContent(edn)');
  console.log('  - validateStructure(original, modified)');
  console.log('  - generateHeatmapEdn(template, content)');
  console.log('  - generateAngleCardEdn(template, content)');
}
