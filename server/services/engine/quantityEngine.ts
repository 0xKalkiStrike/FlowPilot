import type { Page, Locator } from 'playwright';
import { SelectorEngine, SelectorStrategy } from './selectorEngine.js';

export interface QuantityConfig {
  targetStrategy?: 'auto' | 'input' | 'buttons' | 'dropdown';
  desiredQuantity: number;
  inputSelector?: SelectorStrategy | string;
  incrementSelector?: SelectorStrategy | string;
  decrementSelector?: SelectorStrategy | string;
  dropdownSelector?: SelectorStrategy | string;
  maxQuantity?: number;
  minQuantity?: number;
  stepDelayMs?: number;
}

export class QuantityEngine {
  public static async setQuantity(
    page: Page,
    config: QuantityConfig,
    log: (msg: string) => void
  ): Promise<{ success: boolean; finalQuantity: number; methodUsed: string }> {
    let desired = Math.floor(Number(config.desiredQuantity) || 1);
    if (config.minQuantity !== undefined) desired = Math.max(config.minQuantity, desired);
    if (config.maxQuantity !== undefined) desired = Math.min(config.maxQuantity, desired);

    const strategy = config.targetStrategy || 'auto';
    const delay = config.stepDelayMs || 250;

    log(`Setting quantity to ${desired} using strategy: ${strategy}`);

    // 1. Try Direct Input if specified or in auto mode
    if ((strategy === 'auto' || strategy === 'input') && config.inputSelector) {
      try {
        const { locator } = await SelectorEngine.findElement(page, config.inputSelector, 3000);
        await locator.scrollIntoViewIfNeeded();
        await locator.click();
        await locator.fill('');
        await locator.fill(String(desired));
        await locator.press('Enter').catch(() => {});
        log(`✓ Successfully updated quantity input directly to ${desired}`);
        return { success: true, finalQuantity: desired, methodUsed: 'direct_input' };
      } catch (e: any) {
        if (strategy === 'input') throw e;
        log(`Direct input failed, falling back to next strategy: ${e.message}`);
      }
    }

    // 2. Try Dropdown selection
    if ((strategy === 'auto' || strategy === 'dropdown') && config.dropdownSelector) {
      try {
        const { locator } = await SelectorEngine.findElement(page, config.dropdownSelector, 3000);
        await locator.scrollIntoViewIfNeeded();
        await locator.selectOption([
          { value: String(desired) },
          { label: String(desired) },
          { index: desired - 1 }
        ]);
        log(`✓ Selected quantity ${desired} from dropdown`);
        return { success: true, finalQuantity: desired, methodUsed: 'dropdown_select' };
      } catch (e: any) {
        if (strategy === 'dropdown') throw e;
        log(`Dropdown selection failed, falling back: ${e.message}`);
      }
    }

    // 3. Try Increment/Decrement buttons
    if ((strategy === 'auto' || strategy === 'buttons') && config.incrementSelector) {
      try {
        const incResult = await SelectorEngine.findElement(page, config.incrementSelector, 3000);
        await incResult.locator.scrollIntoViewIfNeeded();

        // Check if there is an existing quantity display or assume 1
        let current = 1;
        if (config.inputSelector) {
          try {
            const inputRes = await SelectorEngine.findElement(page, config.inputSelector, 1500);
            const val = await inputRes.locator.inputValue().catch(() => '');
            if (val && !isNaN(parseInt(val, 10))) {
              current = parseInt(val, 10);
            }
          } catch {}
        }

        const delta = desired - current;
        if (delta > 0) {
          log(`Clicking increment button ${delta} times...`);
          for (let i = 0; i < delta; i++) {
            await incResult.locator.click();
            await page.waitForTimeout(delay);
          }
        } else if (delta < 0 && config.decrementSelector) {
          const decResult = await SelectorEngine.findElement(page, config.decrementSelector, 3000);
          log(`Clicking decrement button ${Math.abs(delta)} times...`);
          for (let i = 0; i < Math.abs(delta); i++) {
            await decResult.locator.click();
            await page.waitForTimeout(delay);
          }
        }

        log(`✓ Successfully updated quantity via buttons to ${desired}`);
        return { success: true, finalQuantity: desired, methodUsed: 'button_clicks' };
      } catch (e: any) {
        throw new Error(`Failed to set quantity via buttons: ${e.message}`);
      }
    }

    throw new Error('No valid quantity selector configured (provide inputSelector, dropdownSelector, or incrementSelector)');
  }
}
