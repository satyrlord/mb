---
name: improve-codebase-architecture
description: Find architecture problems and present repair options in an HTML report.
disable-model-invocation: true
---

# Improve Codebase Architecture

Inspect code for modules that expose too much complexity to callers. Use
the terms below in the report:

- **Module:** code with one clear responsibility.
- **Interface:** the part of a module that callers use.
- **Depth:** the amount of work hidden behind an interface. A deep module
  has a small interface and substantial implementation.
- **Seam:** the contract between modules.
- **Adapter:** a module that translates between seams.
- **Locality:** related code lives near other related code.
- **Leverage:** work a module does relative to what callers must know.

## Procedure

1. Read the architecture documents in `docs/` and the relevant code and
   tests. Note each point where one concept requires several modules or a
   module's interface exposes its internal work. Complete this step when
   each candidate has file evidence and a test or caller path.
2. Test each candidate against the current contract. Ask whether a change
   can remove a module, shrink an interface, or place related code together.
   Do not propose a new adapter without a concrete second use. Complete this
   step when each option states the code it would remove or simplify.
3. Write an HTML report to the operating system's temporary directory. Use
   one card for each supported option. Show the files, current problem,
   proposed change, benefit, and a before and after diagram. Mark options
   that conflict with a documented decision. Complete this step when the
   report has an explicit first recommendation and the user can open it.
4. Ask the user which option to examine. Resolve its design decisions one at
   a time with `grill-me`. Record durable decisions in the owning document.
   Complete this step when the selected design and its test plan are clear.

Use [HTML-REPORT.md](HTML-REPORT.md) for the report structure. Do not change
source code unless the user also asks for implementation. Keep the report
grounded in the current code and project documents.
