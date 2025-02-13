import { parse } from 'svelte/compiler';
import { walk } from 'estree-walker';
import { parseAttribute, svelteJsTemplate, svelteTsTemplate } from './utils.js';

export function createComponentWithAst(source: string, filename: string, useTypeScript: boolean, updatefwh: boolean) {
  const ast = parse(source, { filename, modern: true });
  let svgAttributes = '';
  let svgChildren = '';

  walk(ast, {
    enter(node, parent) {
      if (node.type === 'Attribute') {
        if (parent.name === 'svg') return (svgAttributes += parseAttribute(node, updatefwh));

        svgChildren += parseAttribute(node, updatefwh);
      }

      if (node.type === 'RegularElement' && node.name !== 'svg') {
        svgChildren += `<${node.name} `;
      }
    },
    leave(node, parent, prop, index) {
      if (
        node.type === 'Attribute' &&
        parent.name !== 'svg' &&
        typeof index === 'number' &&
        parent.attributes.length === index + 1
      ) {
        svgChildren = svgChildren.trim();
        svgChildren += `>`;
        return;
      }
      if (node.type === 'RegularElement' && node.name !== 'svg') return (svgChildren += `</${node.name}>`);

      if (node.type === 'Text' && parent.type === 'RegularElement') return (svgChildren += node.data + ' ');
    }
  });

  return `${useTypeScript ? svelteTsTemplate : svelteJsTemplate}<svg ${svgAttributes.trim()} {...attributes}>${svgChildren.trim()}{@render children?.()}</svg>`;
}
