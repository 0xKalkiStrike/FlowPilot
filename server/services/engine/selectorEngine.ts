import type { Page, Locator, Frame } from 'playwright';

export interface SelectorStrategy {
  testId?: string;
  role?: string;
  roleName?: string;
  label?: string;
  placeholder?: string;
  text?: string;
  css?: string;
  xpath?: string;
  altText?: string;
  title?: string;
  fallbacks?: string[];
}

export interface SelectorResult {
  locator: Locator;
  matchedStrategy: string;
  confidence: number;
}

export class SelectorEngine {
  /**
   * Attempts to locate an element using a cascading series of resilient strategies
   */
  public static async findElement(
    pageOrFrame: Page | Frame,
    strategies: SelectorStrategy | string,
    timeoutMs: number = 8000
  ): Promise<SelectorResult> {
    // If a simple string was passed, convert to strategy object
    let config: SelectorStrategy = {};
    if (typeof strategies === 'string') {
      const trimmed = strategies.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('(')) {
        config.xpath = trimmed;
      } else if (trimmed.startsWith('#') || trimmed.startsWith('.') || trimmed.includes('>')) {
        config.css = trimmed;
      } else {
        config.text = trimmed;
        config.css = trimmed;
      }
    } else {
      config = strategies || {};
    }

    const attempts: { strategy: string; locator: Locator; confidence: number }[] = [];

    // 1. Test ID (Highest resilience)
    if (config.testId) {
      const loc = pageOrFrame.getByTestId(config.testId);
      attempts.push({ strategy: `TestId: ${config.testId}`, locator: loc, confidence: 1.0 });
    }

    // 2. Role & Accessible Name
    if (config.role) {
      const roleName = config.roleName ? { name: config.roleName, exact: false } : undefined;
      // @ts-ignore
      const loc = pageOrFrame.getByRole(config.role, roleName);
      attempts.push({ strategy: `Role: ${config.role}${config.roleName ? ` ("${config.roleName}")` : ''}`, locator: loc, confidence: 0.95 });
    }

    // 3. Label
    if (config.label) {
      const loc = pageOrFrame.getByLabel(config.label, { exact: false });
      attempts.push({ strategy: `Label: ${config.label}`, locator: loc, confidence: 0.9 });
    }

    // 4. Placeholder
    if (config.placeholder) {
      const loc = pageOrFrame.getByPlaceholder(config.placeholder, { exact: false });
      attempts.push({ strategy: `Placeholder: ${config.placeholder}`, locator: loc, confidence: 0.85 });
    }

    // 5. Alt text / Title
    if (config.altText) {
      const loc = pageOrFrame.getByAltText(config.altText);
      attempts.push({ strategy: `AltText: ${config.altText}`, locator: loc, confidence: 0.8 });
    }
    if (config.title) {
      const loc = pageOrFrame.getByTitle(config.title);
      attempts.push({ strategy: `Title: ${config.title}`, locator: loc, confidence: 0.8 });
    }

    // 6. Text content
    if (config.text) {
      const loc = pageOrFrame.getByText(config.text, { exact: false });
      attempts.push({ strategy: `Text: "${config.text}"`, locator: loc, confidence: 0.75 });
    }

    // 7. CSS Selector
    if (config.css) {
      const loc = pageOrFrame.locator(config.css);
      attempts.push({ strategy: `CSS: ${config.css}`, locator: loc, confidence: 0.7 });
    }

    // 8. Fallback selectors list
    if (Array.isArray(config.fallbacks)) {
      for (const fallback of config.fallbacks) {
        if (fallback && fallback.trim()) {
          const loc = pageOrFrame.locator(fallback.trim());
          attempts.push({ strategy: `Fallback: ${fallback}`, locator: loc, confidence: 0.65 });
        }
      }
    }

    // 9. XPath
    if (config.xpath) {
      const loc = pageOrFrame.locator(`xpath=${config.xpath}`);
      attempts.push({ strategy: `XPath: ${config.xpath}`, locator: loc, confidence: 0.6 });
    }

    if (attempts.length === 0) {
      throw new Error('No selector strategies provided for element detection');
    }

    // Try strategies sequentially with quick timeout
    const perStrategyTimeout = Math.max(1200, Math.floor(timeoutMs / Math.min(attempts.length, 3)));

    for (const attempt of attempts) {
      try {
        await attempt.locator.first().waitFor({ state: 'attached', timeout: perStrategyTimeout });
        const count = await attempt.locator.count();
        if (count > 0) {
          return {
            locator: attempt.locator.first(),
            matchedStrategy: attempt.strategy,
            confidence: attempt.confidence
          };
        }
      } catch (e) {
        // Strategy failed, continue to next fallback
      }
    }

    // If none resolved quickly, do one final attempt with the first strategy with remaining timeout
    try {
      const primary = attempts[0];
      await primary.locator.first().waitFor({ state: 'visible', timeout: 2000 });
      return {
        locator: primary.locator.first(),
        matchedStrategy: primary.strategy,
        confidence: primary.confidence
      };
    } catch {
      throw new Error(
        `Element could not be safely identified. Tried ${attempts.length} selector strategies: [${attempts.map(a => a.strategy).join(' | ')}]`
      );
    }
  }
}
