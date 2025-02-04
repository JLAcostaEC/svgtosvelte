declare module 'estree-walker' {
  import type { AST, SvelteNode } from 'svelte/compiler';

  export function walk(
    ast: AST,
    options: {
      enter: (node: SvelteNode, parentNode: SvelteNode, prop: unknown, index: number | string) => void;
      leave?: (node: SvelteNode, parentNode: SvelteNode, prop: unknown, index: number | string) => void;
    }
  ): void;
}
