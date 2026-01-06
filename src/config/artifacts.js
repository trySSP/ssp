/**
 * Artifact Templates Configuration
 * 
 * Each artifact defines a section type that can be added to the document.
 * Icons use Lucide icon names (string identifiers) for maintainability.
 * Templates are structured for easy API replacement.
 */

export const ARTIFACT_TEMPLATES = [
    {
    id: 'problem-statement',
    title: 'Problem Statement',
    icon: 'Target',
    description: 'Define the problem you are solving',
    defaultContent: `## Problem Statement

### The Problem
What pain point or gap exists in the market?

### Who Experiences This?
Describe your target user in detail.

### Current Alternatives
How do people solve this problem today?

### Why Now?
What has changed that makes this the right time?
`
  },
  {
    id: 'founder-profile',
    title: 'Founder Profile',
    icon: 'User',
    description: 'Background and experience of founders',
    defaultContent: `## Founder Profile

### Background
Share your journey — what led you here?

### Key Strengths
- 
- 
- 

### Relevant Experience
- 
- 

### Why This Problem?
What makes you uniquely positioned to solve this?
`
  },
  {
    id: 'solution-hypothesis',
    title: 'Solution Hypothesis',
    icon: 'Lightbulb',
    description: 'Your proposed solution and value prop',
    defaultContent: `## Solution Hypothesis

### Core Solution
What are you building? Describe it simply.

### Key Features
- 
- 
- 

### Unique Value Proposition
Why will customers choose you over alternatives?

### Assumptions to Validate
- 
- 
`
  },
  {
    id: 'market-notes',
    title: 'Market Notes',
    icon: 'BarChart3',
    description: 'Market size and competitive landscape',
    defaultContent: `## Market Notes

### Market Size
- TAM (Total Addressable Market): 
- SAM (Serviceable Addressable Market): 
- SOM (Serviceable Obtainable Market): 

### Market Trends
- 
- 

### Competitive Landscape
Who else is in this space? How are you different?
`
  },
  {
    id: 'team',
    title: 'Team',
    icon: 'Users',
    description: 'Core team, advisors, and key hires',
    defaultContent: `## Team

### Core Team
| Name | Role | Background |
|------|------|------------|
|      |      |            |

### Advisory Board
- 

### Key Hires Needed
- 
`
  },
  {
    id: 'funding-runway',
    title: 'Funding & Runway',
    icon: 'Wallet',
    description: 'Financial status and funding plans',
    defaultContent: `## Funding & Runway

### Current Status
- Stage: 
- Raised to date: 
- Current runway: 

### Use of Funds
How will you allocate the next round?

### Milestones
What will you achieve with this funding?
`
  },
  {
    id: 'risks-unknowns',
    title: 'Risks & Unknowns',
    icon: 'AlertTriangle',
    description: 'Key risks and open questions',
    defaultContent: `## Risks & Unknowns

### Key Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
|      |           |        |            |

### Open Questions
Things you're still figuring out:
- 
- 

### Assumptions
What must be true for this to work?
- 
`
  },
  {
    id: 'external-references',
    title: 'External References',
    icon: 'Link',
    description: 'Documents, links, and research sources',
    defaultContent: `## External References

### Documents & Links
- 

### Research & Data Sources
- 

### Inspiration & Comparables
- 
`
  },
  {
    id: 'custom',
    title: 'Custom Section',
    icon: 'FileText',
    description: 'A blank section for anything else',
    defaultContent: null
  }
]

/**
 * Fetch artifact templates
 * Currently returns static data, can be swapped for API call
 */
export async function fetchArtifactTemplates() {
  // TODO: Replace with API call when ready
  // return fetch('/api/artifacts/templates').then(r => r.json())
  return ARTIFACT_TEMPLATES
}

/**
 * Get a single template by ID
 */
export function getArtifactTemplate(id) {
  return ARTIFACT_TEMPLATES.find(t => t.id === id)
}
