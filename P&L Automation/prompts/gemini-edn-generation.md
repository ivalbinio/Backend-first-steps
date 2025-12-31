# Gemini Pro EDN Generation Prompt Pattern

This prompt pattern works for generating Pitch.com slides directly in EDN format.

## Available Templates

Full EDN templates are stored in `prompts/templates/`:

| Template | Description | Size |
|----------|-------------|------|
| `heatmap_pnl_canonical.edn` | **CANONICAL** P&L heatmap with 16 workflow rows | 30KB |
| `heatmap_pnl_simple_canonical.edn` | **CANONICAL** Simple P&L heatmap (no "on call" mention) | 18KB |
| `angle_cards_double_canonical.edn` | **CANONICAL** 2 workflow cards with domain headers | 26KB |
| `angle_cards_triple_canonical.edn` | **CANONICAL** 3 workflow cards (Portuguese example) | 35KB |
| `heatmap.edn` | Full P&L heatmap with table | 31KB |
| `heatmap_pnl.edn` | Compact P&L heatmap | 17KB |
| `heatmap_pnl_red.edn` | Red header variant | 16KB |
| `angle_cards_double.edn` | 2 workflow cards | 26KB |
| `angle_cards_double_with_domains.edn` | 2 cards with domain headers | 32KB |
| `angle_cards_triple.edn` | 3 workflow cards | 35KB |
| `development_approach.edn` | 3-layer architecture slide | 115KB |

## Key Elements

1. **Context Brief**: Detailed description of the use cases with:
   - Company and audience (e.g., "Bio-Techne C-levels")
   - Focus areas (e.g., "high ROI AI/ML levers")
   - Style requirements ("P&L driven", "top tier use cases", "no brainers", "massive ROI")

2. **Structured Use Cases**: Each case should include:
   - Case ID and title (e.g., "1.1 Precision commercial engine")
   - Primary segment/domain
   - Primary P&L impact (revenue, gross margin, COGS, etc.)
   - 3-5 specific workflows with descriptions

3. **Template EDN**: Provide the exact EDN structure as an example

4. **Instructions**: "produce outputs like this one for each of the 4 in exact same code structure format and style, but just swap out the text content by relevant ones, and also the icon"

## Example Prompt Structure

```
im building a deck for [COMPANY] [AUDIENCE] regarding high roi ai (/ml) levers for them.
should be highly relevant, pnl driven and focus on top tier use cases for them that are
no brainers and have massive roi and actual important relevant impact and value.

i want to build [N] cases:

[CASE 1 DETAILS]
- Primary segment: [SEGMENT]
- Primary P&L impact: [IMPACT AREAS]
- [WORKFLOW 1]: [DESCRIPTION]
- [WORKFLOW 2]: [DESCRIPTION]
...

[CASE 2 DETAILS]
...

based on these pls, produce outputs like this one for each of the [N] in exact same code
structure format and style, but just swap out the txt content by relevant ones, and also
the icon, and make sure it matches perfectly w the current text length and mckinsey style etc:

example:
[PASTE FULL EDN TEMPLATE HERE]
```

## Template EDN Elements to Preserve

- All `#uuid` references (font IDs, block IDs)
- `:coords` positioning
- `:font-size`, `:font-weight`, `:line-height`
- `:fill-color`, `:text-color`, `:border-color`
- `:block-type` and `:shape-type`
- CSS styling in `:body` fields

## Text Elements to Replace

- Main title (e.g., "Commercial & Market Access")
- Subtitle (e.g., "Revenue growth through pricing, targeting, and competitive insight")
- CHALLENGES bullets (3 items)
- SOLUTION bullets (5 items)
- IMPACT bullets (3 items with percentages)
- Icon URL (e.g., `Material-Outlined/trending_up.svg`)

## Icon Categories

Common Material Outlined icons for different domains:
- Revenue/Commercial: `trending_up`, `attach_money`, `shopping_cart`
- Operations/Supply Chain: `local_shipping`, `inventory`, `factory`
- Finance/Planning: `account_balance`, `analytics`, `calculate`
- Data/Tech: `storage`, `cloud`, `memory`
- R&D/Science: `science`, `biotech`, `hub`
