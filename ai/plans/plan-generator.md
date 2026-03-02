# Plan Generator

This prompt is used to generate a plan file from provided context.

## Non-Negotiable Rules

1. Explain before generating anything.
2. Follow code culture [code-culture-1.1.md](ai/code-culture-1.1.md).

## Input

- Context: project/task details provided by the user.
- Constraints: timeline, scope, tooling, dependencies, and risks.
- Goal: expected outcome and completion criteria.

## Output Contract

Generate a markdown plan file with this structure:

1. `## Understanding`
2. `## Assumptions`
3. `## Scope`
4. `## Execution Plan`
5. `## Risks and Mitigations`
6. `## Validation`
7. `## Deliverables`

## Generation Instructions

1. Start with a short explanation of what will be generated and why.
2. Explicitly align decisions with `ai/code-culture-1.1.md`.
3. Break the work into ordered, actionable steps.
4. Keep each step specific enough to execute without guessing.
5. Include testing/validation checkpoints.
6. Call out open questions and blockers early.
7. Avoid vague language; use concrete actions and outcomes.

## Quality Bar

- Clear: easy to scan and understand.
- Practical: directly executable by an engineer.
- Complete: covers implementation, testing, and handoff.
- Culturally aligned: consistent with `ai/code-culture-1.1.md`.
