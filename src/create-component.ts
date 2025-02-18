import { parse } from 'svelte/compiler';
import { walk } from 'estree-walker';
import { parseAttribute, svelteJsTemplate, svelteTsTemplate } from './utils.js';

const NodeTypes = [
  // Tags
  'RegularElement',
  // Tag attributes
  'Attribute',
  // Values, New Lines, Inner Text and a lot of other things
  'Text'
];

export function createComponentWithAst(source: string, filename: string, useTypeScript: boolean, updatefwh: boolean) {
  const ast = parse(source, { filename, modern: true });
  let content = '';

  walk(ast, {
    enter(node, parent) {
      // Skip unnecessary nodes
      if (NodeTypes.every((i) => node.type !== i)) return;

      if (node.type === 'RegularElement') {
        content += `<${node.name} `;
        // Close the tag if there are no attributes
        if (node.attributes.length === 0) {
          content = content.trim() + `>`;
          return;
        }
        return;
      }

      if (node.type === 'Attribute') {
        content += parseAttribute(node, updatefwh);
        return;
      }

      // Handle tags inner text: <tag>inner text</tag>
      if (node.type === 'Text' && parent.type === 'Fragment') {
        // Remove new lines and trim the inner text
        if ((node.data as string).includes('\n')) node.data = node.data.replace(/\n/g, '').trim();
        content += node.data;
        return;
      }
    },
    leave(node, parent, prop, index) {
      // If the node is the last attribute, close the tag
      if (node.type === 'Attribute' && index === parent.attributes.length - 1) {
        content = content.trim();
        // Append dynamic attributes to SVG elements
        if (parent.name === 'svg') content += ' {...attributes}';
        content += `>`;
        return;
      }

      if (node.type === 'RegularElement') {
        content += `</${node.name}>`;
        return;
      }
    }
  });

  return `${useTypeScript ? svelteTsTemplate : svelteJsTemplate}${content}`;
}
