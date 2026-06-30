---
name: improve-codebase-architecture
description: Surface architectural friction in a codebase, package it as a visual HTML report, and grill through the strongest deepening opportunity.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

Use this shared design vocabulary — stay on these terms, don't drift into
"component," "service," "API," or "boundary":

- **module** — a unit of code with a single responsibility
- **interface** — what a module exposes; the surface callers depend on
- **depth** — how much complexity a module hides behind its interface;
  a **deep** module has a small interface hiding a large implementation
- **seam** — the place where two modules meet; their shared contract
- **adapter** — a module whose sole job is to translate between two seams
- **leverage** — how much work a module does relative to what a caller
  must understand to use it
- **locality** — how close related code lives; code that changes together
  should live together

Principles:

- **Deletion test** — would deleting this module concentrate complexity
  (good, it's deep), or just move it (bad, it's shallow)?
- **The interface is the test surface** — if a module is hard to test,
  its interface is wrong
- **One adapter = hypothetical seam, two = real** — the first adapter on a
  seam is scaffolding; the second proves the seam is right

The domain language in `docs/` (project documentation)
names good seams. Create `docs/glossary.md` lazily when shared terminology
is needed across docs.

## Process

### 1. Explore

Read the project's architecture docs first. If a `docs/glossary.md` domain
glossary exists, read that too.

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo.
Resolve the temp dir from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write
to `<tmpdir>/architecture-review-<timestamp>.html` so each run gets a fresh file. Open it for the
user — `xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows — and tell
them the absolute path.

The report uses **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** for diagrams
where a graph/flow/sequence reliably communicates the structure. Mix Mermaid with hand-crafted
CSS/SVG visuals — use Mermaid when relationships are graph-shaped (call graphs, dependencies,
sequences), and hand-built divs/SVG when you want something more editorial (mass diagrams,
cross-sections, collapse animations). Each candidate gets a **before/after visualisation**.
Be visual.

For each candidate, render a card with:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and how tests would improve
- **Before / After diagram** — side-by-side, custom-drawn, illustrating the shallowness and the deepening
- **Recommendation strength** — one of `Strong`, `Worth exploring`, `Speculative`, rendered as a badge

End the report with a **Top recommendation** section: which candidate you'd tackle first and why.

**Use the domain vocabulary from the `docs/` folder
and the terms defined above.** If `docs/glossary.md`
exists, use its terms — don't drift into "component," "service," "API," or
"boundary."

**Existing decision conflicts**: if a candidate contradicts a decision recorded in an existing doc,
only surface it when the friction is real enough to warrant revisiting that decision. Mark it
clearly in the card. Don't list every theoretical refactor a past decision forbids.

See [HTML-REPORT.md](HTML-REPORT.md) for the full HTML scaffold, diagram patterns, and styling guidance.

Do NOT propose interfaces yet. After the file is written, ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, run the `grill-me` skill to walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize — use `add-feature` to
record durable decisions as you go:

- **Naming a deepened module after a concept not yet documented?** Add the
  term to the relevant doc under `docs/`. Create `docs/glossary.md` lazily
  if a cross-cutting glossary is needed.
- **Sharpening a fuzzy term during the conversation?** Update the relevant
  doc right there.
- **User rejects the candidate with a load-bearing reason?** Offer to record
  it as a durable decision in the relevant doc, framed as: _"Want me to
  record this so future architecture reviews don't re-suggest it?"_ Only
  offer when the reason would actually be needed by a future explorer to
  avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it
  right now") and self-evident ones.
- **Want to explore alternative interfaces for the deepened module?** Design
  two competing interfaces in parallel, compare them against the deletion
  test and leverage, and record the winner.

## Completion Criterion

The architecture review is complete when:

- the HTML report is written to the temp directory, opened for the user, and
  clearly communicates the candidate trade-offs,
- the top recommendation is explicit,
- and any durable architecture decisions that emerge are recorded in the
  relevant docs.
