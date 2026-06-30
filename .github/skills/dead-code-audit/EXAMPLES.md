# Dead Code Audit Examples

## Example 1: Audit-Only Scan

- Prompt shape: "Run a dead-code scan and tell me what is really dead."
- Good behavior: run the scan, inspect only reported artifacts, and return a
  findings list without editing code.
- Good result: separate provable dead code from false positives caused by entry
  wiring or generated usage.

## Example 2: Cleanup Of One Proven Helper

- Prompt shape: "Clean up the unused icon helper reported by the scan."
- Good behavior: prove there are no direct uses, DOM references, or test
  dependencies before deleting the smallest slice.
- Good result: one focused deletion followed by targeted validation.

## Example 3: False Positive From Entry Wiring

- Prompt shape: "Why did the scan mark this settings controller unused?"
- Good behavior: trace the symbol through `src/index.ts` bootstrap wiring,
  DOM event listeners, and config file references before deleting it.
- Good result: report the false positive and recommend the narrowest recurring
  suppression only if the same pattern will keep appearing.
