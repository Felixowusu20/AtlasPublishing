declare module "pagedjs" {
  export class Previewer {
    constructor(options?: Record<string, unknown>);
    preview(
      content?: Node | string,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: HTMLElement,
    ): Promise<{ total?: number }>;
    polisher: { destroy: () => void };
  }
}
