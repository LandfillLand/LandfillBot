declare module 'markstream-vue' {
  export const MarkdownRender: any;
  export const MarkdownCodeBlockNode: any;

  export function enableKatex(loader?: any): void;
  export function enableMermaid(loader?: any): void;

  export function setCustomComponents(mapping: Record<string, any>): void;
  export function setCustomComponents(customId: string, mapping: Record<string, any>): void;
}
