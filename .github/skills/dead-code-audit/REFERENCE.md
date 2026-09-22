# Dead Code Audit Reference

Delete code only when all these checks pass:

- No static import or call uses it.
- No HTML or Vite entrypoint and no config file uses it.
- No dynamic import, DOM lookup, CSS selector, or serialized format uses it.
- No test, fixture, or generated artifact needs it.

Search for the relevant names and paths with `rg`. Inspect the actual caller
when a name is built at runtime. A tool result alone does not prove that code
is unused.

If any check is uncertain, report the uncertainty and keep the code. If a
check fails, record its exact command and output. Rerun affected checks
after a deletion.
