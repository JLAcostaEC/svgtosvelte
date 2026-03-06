export const svelteTsTemplate = `<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';
  let { children, ...attributes }: SVGAttributes<SVGElement> = $props();
</script>
`;

export const svelteJsTemplate = `<script>
  /** @type {import('svelte/elements').SVGAttributes<SVGElement>} */ 
  let { children, ...attributes } = $props();
</script>
`;
