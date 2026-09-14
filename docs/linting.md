# Linting

```
pnpm lint       # report
pnpm lint:fix   # apply the safe fixes
```

## Why Biome and not ESLint

`next lint` was removed in Next 16, so for a while `pnpm lint` ran nothing and
nothing else checked. `tsc` catches types; it does not catch a `useEffect`
missing a dependency, an import that stopped being used three refactors ago, or
an `aria-label` on an element that cannot carry one — all of which were sitting
in this codebase and all of which the first run found.

ESLint was tried first and cannot run here. This project is on TypeScript 7,
and typescript-eslint refuses to load against it — not a degraded mode, a hard
throw on import, in the meta package *and* in the parser
([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).
Without that parser ESLint cannot read a `.ts` file at all. Pinning an older
TypeScript for the linter alone was tried too; pnpm's dependency graph did not
give it up. Biome brings its own parser, so the compiler version is not its
business.

The trade-off worth knowing: Biome has no type-aware rules, so
`no-floating-promises` has no equivalent here. A forgotten `await` on a Server
Action still looks exactly like a working save. If typescript-eslint gains TS 7
support, that one rule is worth revisiting on its own.

## Rules that are off, and why

These are switched off in `biome.json` because they were wrong about this
codebase, not because they were inconvenient. Anything that was actually right
got fixed instead.

| Rule | Why |
|---|---|
| `a11y/noSvgWithoutTitle`, `a11y/useAltText` | Both are blind to prop spreads. Every icon here is `<svg {...base}>` where `base` carries `aria-hidden`, and the hero is `<img {...rest}>` where `rest` comes from `getImageProps` with the alt already in it. Verified at runtime: no image on any page is missing an alt. |
| `security/noDangerouslySetInnerHtml` | Four uses, all `JSON.stringify` into a `<script type="application/ld+json">`. Tested for real by saving `</script><img onerror=…>` as a product name through the admin form: React escaped it to `<` and nothing ran. |
| `a11y/noAutofocus` | One use: the cancel-reason box in the order status menu, focused because the operator just opened it to type there. Moving focus to what the user asked for is the point of the rule, not a violation of it. |
| `complexity/noImportantStyles` | Tailwind arbitrary values that genuinely need to win. |
| `suspicious/noArrayIndexKey` | Order lines are rendered from an immutable snapshot; the index is stable because the list never reorders. |

`correctness/useExhaustiveDependencies` is a **warning**, not an error. Several
of the effects here deliberately depend on less than they read — the checkout's
prefill latch, for instance, reads the profile but must not re-run when it
changes. Each of those deserves reading before it is silenced, so they stay
visible rather than disappearing into a config file.
