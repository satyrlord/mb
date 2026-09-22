# Architecture Report Format

Write one HTML file in the operating system's temporary directory. Use
embedded CSS and SVG so the file opens without a network connection. Give
the user its absolute path.

## Structure

1. Header: repository name, date, and diagram key.
2. One card for each supported candidate.
3. Final section: the first recommendation and its reason.

Each card must name the affected files and the current code path. State the
problem, proposed change, and benefit in short sentences. Show before and
after diagrams. Mark the strength as `Strong`, `Worth exploring`, or
`Speculative`. Mark any conflict with an existing project decision.

Use SVG boxes for modules and arrows for calls or data flow. Use a dashed
line for a seam. Show the interface and implementation when their relative
sizes explain why a module is shallow. Label each line and box. The diagram
must remain understandable when printed in gray scale.

Use the terms defined in [SKILL.md](SKILL.md). State measurable gains when
possible, such as fewer calls, branches, or modules. Do not claim that an
option improves tests unless you can name the test path it enables.
