import type { Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';
import { SelectorEngine, SelectorStrategy } from './selectorEngine.js';
import { VariableEngine } from './variableEngine.js';
import { QuantityEngine } from './quantityEngine.js';
import { runPythonScript, runJavaScriptScript, runCliCommand } from './codeRunners.js';
import { SCREENSHOTS_DIR, DOWNLOADS_DIR } from '../../config.js';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutionContext {
  page?: Page;
  context?: BrowserContext;
  variables: Record<string, any>;
  log: (message: string, level?: 'info' | 'warn' | 'error' | 'success') => void;
  takeScreenshot: (label?: string) => Promise<string | null>;
  pauseForHumanVerification: (reason: string) => Promise<void>;
  executionId: string;
}

export type NodeExecutor = (nodeData: any, ctx: ExecutionContext) => Promise<{ nextHandle?: string; output?: any }>;

export const nodeExecutors: Record<string, NodeExecutor> = {
  // -------------------------------------------------------------
  // TRIGGERS
  // -------------------------------------------------------------
  'trigger_manual': async (data, ctx) => {
    ctx.log('Workflow started via Manual Trigger', 'info');
    return {};
  },
  'trigger_schedule': async (data, ctx) => {
    ctx.log(`Workflow started via Schedule Trigger (${data.cron || 'Scheduled'})`, 'info');
    return {};
  },
  'trigger_webhook': async (data, ctx) => {
    ctx.log('Workflow started via Webhook Trigger', 'info');
    return {};
  },

  // -------------------------------------------------------------
  // BROWSER
  // -------------------------------------------------------------
  'browser_open_url': async (data, ctx) => {
    let rawUrl = data.url || 'https://google.com';
    let url = VariableEngine.resolve(rawUrl, ctx.variables);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const timeout = parseInt(data.timeout, 10) || 30000;
    const waitUntil = data.waitUntil || 'domcontentloaded';

    ctx.log(`Navigating to ${url} (waitUntil: ${waitUntil})...`, 'info');
    await ctx.page.goto(url, { timeout, waitUntil });
    ctx.log(`✓ Successfully loaded ${url}`, 'success');
    return {};
  },

  'browser_go_back': async (data, ctx) => {
    ctx.log('Navigating back in browser history...', 'info');
    await ctx.page.goBack({ timeout: 15000 });
    return {};
  },

  'browser_go_forward': async (data, ctx) => {
    ctx.log('Navigating forward in browser history...', 'info');
    await ctx.page.goForward({ timeout: 15000 });
    return {};
  },

  'browser_reload': async (data, ctx) => {
    ctx.log('Reloading active page...', 'info');
    await ctx.page.reload({ timeout: 20000 });
    return {};
  },

  'browser_new_tab': async (data, ctx) => {
    ctx.log('Opening new browser tab...', 'info');
    const newPage = await ctx.context.newPage();
    ctx.page = newPage;
    if (data.url) {
      const url = VariableEngine.resolve(data.url, ctx.variables);
      await newPage.goto(url, { waitUntil: 'domcontentloaded' });
    }
    return {};
  },

  'browser_close_tab': async (data, ctx) => {
    ctx.log('Closing current browser tab...', 'info');
    const pages = ctx.context.pages();
    if (pages.length > 1) {
      await ctx.page.close();
      ctx.page = ctx.context.pages()[0];
    } else {
      ctx.log('Cannot close the only open tab', 'warn');
    }
    return {};
  },

  'browser_switch_tab': async (data, ctx) => {
    const pages = ctx.context.pages();
    const index = parseInt(data.tabIndex || '0', 10);
    if (pages[index]) {
      ctx.page = pages[index];
      await ctx.page.bringToFront();
      ctx.log(`✓ Switched to tab #${index}`, 'info');
    }
    return {};
  },

  'browser_wait': async (data, ctx) => {
    const duration = parseInt(VariableEngine.resolve(data.duration || '2000', ctx.variables), 10);
    ctx.log(`Waiting for ${duration}ms...`, 'info');
    await ctx.page.waitForTimeout(duration);
    return {};
  },

  'browser_wait_for_element': async (data, ctx) => {
    const state = data.state || 'visible';
    const timeout = parseInt(data.timeout || '10000', 10);
    ctx.log(`Waiting for element to be ${state}...`, 'info');
    const { locator, matchedStrategy } = await SelectorEngine.findElement(ctx.page, data.selector || data, timeout);
    await locator.waitFor({ state, timeout });
    ctx.log(`✓ Element ready (${matchedStrategy})`, 'success');
    return {};
  },

  'browser_scroll': async (data, ctx) => {
    const direction = data.direction || 'down';
    const distance = parseInt(data.distance || '500', 10);
    ctx.log(`Scrolling ${direction} by ${distance}px...`, 'info');

    if (direction === 'bottom') {
      await ctx.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else if (direction === 'top') {
      await ctx.page.evaluate(() => window.scrollTo(0, 0));
    } else if (direction === 'up') {
      await ctx.page.evaluate((d) => window.scrollBy(0, -d), distance);
    } else {
      await ctx.page.evaluate((d) => window.scrollBy(0, d), distance);
    }
    return {};
  },

  'browser_screenshot': async (data, ctx) => {
    const label = data.label || 'Screenshot';
    ctx.log(`Capturing screenshot: ${label}...`, 'info');
    const filename = await ctx.takeScreenshot(label);
    ctx.log(`✓ Screenshot captured: ${filename}`, 'success');
    return { output: filename };
  },

  // -------------------------------------------------------------
  // INTERACTION
  // -------------------------------------------------------------
  'interaction_click': async (data, ctx) => {
    const timeout = parseInt(data.timeout || '8000', 10);
    const { locator, matchedStrategy } = await SelectorEngine.findElement(ctx.page, data.selector || data, timeout);
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    ctx.log(`Clicking element (${matchedStrategy})...`, 'info');
    await locator.click({ timeout, force: Boolean(data.force) });
    ctx.log('✓ Click completed', 'success');
    return {};
  },

  'interaction_double_click': async (data, ctx) => {
    const { locator, matchedStrategy } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    ctx.log(`Double clicking element (${matchedStrategy})...`, 'info');
    await locator.dblclick();
    return {};
  },

  'interaction_right_click': async (data, ctx) => {
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    await locator.click({ button: 'right' });
    return {};
  },

  'interaction_hover': async (data, ctx) => {
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    await locator.hover();
    return {};
  },

  'interaction_type_text': async (data, ctx) => {
    const rawText = data.text !== undefined ? data.text : '';
    const text = VariableEngine.resolve(rawText, ctx.variables);
    const isMasked = Boolean(data.isMasked || data.password);
    const displayLog = isMasked ? '••••••••' : text;

    const { locator, matchedStrategy } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    ctx.log(`Typing "${displayLog}" into element (${matchedStrategy})...`, 'info');

    if (data.clearFirst !== false) {
      await locator.fill('');
    }

    if (data.delayMs && parseInt(data.delayMs, 10) > 0) {
      await locator.pressSequentially(text, { delay: parseInt(data.delayMs, 10) });
    } else {
      await locator.fill(text);
    }

    if (data.pressEnter) {
      await locator.press('Enter');
    }
    ctx.log('✓ Text typed successfully', 'success');
    return {};
  },

  'interaction_clear': async (data, ctx) => {
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    await locator.fill('');
    return {};
  },

  'interaction_press_key': async (data, ctx) => {
    const key = data.key || 'Enter';
    ctx.log(`Pressing key: ${key}...`, 'info');
    if (data.selector && (data.selector.css || data.selector.xpath || typeof data.selector === 'string')) {
      const { locator } = await SelectorEngine.findElement(ctx.page, data.selector, 5000);
      await locator.press(key);
    } else {
      await ctx.page.keyboard.press(key);
    }
    return {};
  },

  'interaction_press_enter': async (data, ctx) => {
    ctx.log('Pressing Enter...', 'info');
    await ctx.page.keyboard.press('Enter');
    return {};
  },

  'interaction_drag_drop': async (data, ctx) => {
    const source = await SelectorEngine.findElement(ctx.page, data.sourceSelector, 8000);
    const target = await SelectorEngine.findElement(ctx.page, data.targetSelector, 8000);
    ctx.log('Performing drag and drop...', 'info');
    await source.locator.dragTo(target.locator);
    return {};
  },

  // -------------------------------------------------------------
  // FORMS
  // -------------------------------------------------------------
  'form_email': async (data, ctx) => {
    let email = data.email || '';
    if (data.credentialId) {
      email = VariableEngine.resolve(`{{credentials.${data.credentialId}.username}}`, ctx.variables);
    } else {
      email = VariableEngine.resolve(email, ctx.variables);
    }
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || {
      role: 'textbox',
      roleName: 'Email',
      placeholder: 'email',
      css: 'input[type="email"], input[name*="email"], input[id*="email"]'
    }, 8000);

    ctx.log(`Filling email: ${email}`, 'info');
    await locator.fill(email);
    return {};
  },

  'form_password': async (data, ctx) => {
    let password = '';
    if (data.credentialId) {
      password = VariableEngine.resolve(`{{credentials.${data.credentialId}.password}}`, ctx.variables);
    } else if (data.password) {
      password = VariableEngine.resolve(data.password, ctx.variables);
    }

    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || {
      role: 'textbox',
      placeholder: 'password',
      css: 'input[type="password"], input[name*="password"], input[id*="password"]'
    }, 8000);

    ctx.log('Filling password securely [PROTECTED]...', 'info');
    await locator.fill(password);
    return {};
  },

  'form_text': async (data, ctx) => {
    return nodeExecutors['interaction_type_text'](data, ctx);
  },

  'form_textarea': async (data, ctx) => {
    return nodeExecutors['interaction_type_text'](data, ctx);
  },

  'form_number': async (data, ctx) => {
    const value = VariableEngine.resolve(data.value || '1', ctx.variables);
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    ctx.log(`Entering number ${value}...`, 'info');
    await locator.fill(String(value));
    return {};
  },

  'form_checkbox': async (data, ctx) => {
    const shouldCheck = data.checked !== false;
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    ctx.log(`Setting checkbox to ${shouldCheck ? 'checked' : 'unchecked'}...`, 'info');
    if (shouldCheck) {
      await locator.check();
    } else {
      await locator.uncheck();
    }
    return {};
  },

  'form_radio': async (data, ctx) => {
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    ctx.log('Selecting radio button...', 'info');
    await locator.check();
    return {};
  },

  'form_dropdown': async (data, ctx) => {
    const rawVal = data.value !== undefined ? data.value : (data.label || '');
    const value = VariableEngine.resolve(rawVal, ctx.variables);
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    ctx.log(`Selecting dropdown option: ${value}...`, 'info');
    await locator.selectOption([
      { value },
      { label: value }
    ]);
    return {};
  },

  'form_multi_select': async (data, ctx) => {
    const values = Array.isArray(data.values) ? data.values : [data.values];
    const resolved = values.map(v => VariableEngine.resolve(v, ctx.variables));
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    ctx.log(`Multi-selecting options: ${resolved.join(', ')}...`, 'info');
    await locator.selectOption(resolved);
    return {};
  },

  // -------------------------------------------------------------
  // PAYMENT FORM ELEMENTS (Safe UI autofill)
  // -------------------------------------------------------------
  'payment_card_number': async (data, ctx) => {
    let cardNum = '';
    if (data.credentialId) {
      cardNum = VariableEngine.resolve(`{{credentials.${data.credentialId}.secret}}`, ctx.variables);
    } else if (data.cardNumber) {
      cardNum = VariableEngine.resolve(data.cardNumber, ctx.variables);
    }
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || {
      placeholder: 'Card number',
      css: 'input[autocomplete="cc-number"], input[name*="card"], input[id*="card"]'
    }, 8000);

    ctx.log('Entering card number [PROTECTED]...', 'info');
    await locator.fill(cardNum);
    return {};
  },

  'payment_expiry': async (data, ctx) => {
    const expiry = VariableEngine.resolve(data.expiry || data.value || '12/28', ctx.variables);
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || {
      placeholder: 'MM / YY',
      css: 'input[autocomplete="cc-exp"], input[name*="exp"], input[id*="exp"]'
    }, 8000);
    ctx.log('Entering card expiration date...', 'info');
    await locator.fill(expiry);
    return {};
  },

  'payment_cvv': async (data, ctx) => {
    let cvv = '';
    if (data.credentialId) {
      cvv = VariableEngine.resolve(`{{credentials.${data.credentialId}.secret}}`, ctx.variables);
    } else if (data.cvv) {
      cvv = VariableEngine.resolve(data.cvv, ctx.variables);
    }
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || {
      placeholder: 'CVV',
      css: 'input[autocomplete="cc-csc"], input[name*="cvv"], input[id*="cvv"], input[name*="security"]'
    }, 8000);
    ctx.log('Entering CVV code [PROTECTED]...', 'info');
    await locator.fill(cvv);
    return {};
  },

  'payment_cardholder': async (data, ctx) => {
    const name = VariableEngine.resolve(data.name || 'Cardholder', ctx.variables);
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || {
      placeholder: 'Name on card',
      css: 'input[autocomplete="cc-name"], input[name*="holder"], input[id*="holder"]'
    }, 8000);
    ctx.log(`Entering cardholder name: ${name}`, 'info');
    await locator.fill(name);
    return {};
  },

  // -------------------------------------------------------------
  // QUANTITY AUTOMATION
  // -------------------------------------------------------------
  'action_set_quantity': async (data, ctx) => {
    const desired = parseInt(VariableEngine.resolve(data.quantity || '1', ctx.variables), 10);
    const config = {
      targetStrategy: data.strategy || 'auto',
      desiredQuantity: desired,
      inputSelector: data.inputSelector || data.selector,
      incrementSelector: data.incrementSelector,
      decrementSelector: data.decrementSelector,
      dropdownSelector: data.dropdownSelector,
      minQuantity: data.minQuantity ? parseInt(data.minQuantity, 10) : 1,
      maxQuantity: data.maxQuantity ? parseInt(data.maxQuantity, 10) : 99,
      stepDelayMs: data.stepDelayMs ? parseInt(data.stepDelayMs, 10) : 250,
    };
    const res = await QuantityEngine.setQuantity(ctx.page, config, (msg) => ctx.log(msg, 'info'));
    return { output: res };
  },

  // -------------------------------------------------------------
  // LOGIC & CONTROL FLOW
  // -------------------------------------------------------------
  'logic_if': async (data, ctx) => {
    const conditionType = data.conditionType || 'variable'; // 'variable' | 'elementExists' | 'elementVisible'
    let isTrue = false;

    if (conditionType === 'elementExists' || conditionType === 'elementVisible') {
      try {
        const { locator } = await SelectorEngine.findElement(ctx.page, data.selector, 3000);
        if (conditionType === 'elementVisible') {
          isTrue = await locator.isVisible();
        } else {
          isTrue = (await locator.count()) > 0;
        }
      } catch {
        isTrue = false;
      }
    } else {
      const left = VariableEngine.resolve(data.leftValue, ctx.variables);
      const right = VariableEngine.resolve(data.rightValue, ctx.variables);
      const operator = data.operator || 'equals';
      isTrue = VariableEngine.evaluateCondition(operator, left, right);
      ctx.log(`Evaluating IF (${left} ${operator} ${right}) => ${isTrue}`, 'info');
    }

    ctx.log(`Condition result: ${isTrue ? 'TRUE' : 'FALSE'}`, isTrue ? 'success' : 'warn');
    return { nextHandle: isTrue ? 'true' : 'false', output: isTrue };
  },

  'logic_switch': async (data, ctx) => {
    const testVal = String(VariableEngine.resolve(data.value, ctx.variables)).trim();
    ctx.log(`Evaluating Switch case for: "${testVal}"`, 'info');
    // If matching case exists in handles, return it, otherwise 'default'
    const cases = Array.isArray(data.cases) ? data.cases : [];
    const matched = cases.find((c: string) => c.trim().toLowerCase() === testVal.toLowerCase());
    return { nextHandle: matched ? matched : 'default' };
  },

  'logic_human_pause': async (data, ctx) => {
    const reason = data.reason || 'Human verification / CAPTCHA required. Please complete in browser and click Resume.';
    ctx.log(`⚠️ ${reason}`, 'warn');
    await ctx.pauseForHumanVerification(reason);
    ctx.log('✓ Human verification marked complete, resuming workflow...', 'success');
    return {};
  },

  // -------------------------------------------------------------
  // DATA EXTRACTION & MANIPULATION
  // -------------------------------------------------------------
  'data_extract_text': async (data, ctx) => {
    const varName = data.variableName || 'extractedText';
    const { locator, matchedStrategy } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    const text = (await locator.innerText().catch(() => locator.textContent())) || '';
    const cleanText = text.trim();
    ctx.variables[varName] = cleanText;
    ctx.log(`✓ Extracted text [${cleanText}] -> variable {{${varName}}} (${matchedStrategy})`, 'success');
    return { output: cleanText };
  },

  'data_extract_attribute': async (data, ctx) => {
    const attrName = data.attribute || 'href';
    const varName = data.variableName || 'extractedAttr';
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    const val = (await locator.getAttribute(attrName)) || '';
    ctx.variables[varName] = val;
    ctx.log(`✓ Extracted attribute @${attrName} [${val}] -> variable {{${varName}}}`, 'success');
    return { output: val };
  },

  'data_extract_value': async (data, ctx) => {
    const varName = data.variableName || 'extractedVal';
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    const val = (await locator.inputValue()) || '';
    ctx.variables[varName] = val;
    ctx.log(`✓ Extracted input value [${val}] -> variable {{${varName}}}`, 'success');
    return { output: val };
  },

  'data_extract_table': async (data, ctx) => {
    const varName = data.variableName || 'extractedTable';
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || { css: 'table' }, 8000);
    const tableData = await locator.evaluate((table: HTMLTableElement) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length === 0) return [];
      const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '');
      return rows.slice(1).map(row => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h || `col_${i}`] = cells[i] || '';
        });
        return obj;
      });
    });
    ctx.variables[varName] = tableData;
    ctx.log(`✓ Extracted table with ${tableData.length} rows -> {{${varName}}}`, 'success');
    return { output: tableData };
  },

  'data_extract_links': async (data, ctx) => {
    const varName = data.variableName || 'extractedLinks';
    const selector = data.selector?.css || data.selector || 'a[href]';
    const links = await ctx.page.$$eval(selector, (elements) => elements.map(el => ({
      text: el.textContent?.trim() || '',
      href: (el as HTMLAnchorElement).href || ''
    })));
    ctx.variables[varName] = links;
    ctx.log(`✓ Extracted ${links.length} links -> {{${varName}}}`, 'success');
    return { output: links };
  },

  'data_set_variable': async (data, ctx) => {
    const varName = data.name || 'myVar';
    const resolvedVal = VariableEngine.resolve(data.value, ctx.variables);
    ctx.variables[varName] = resolvedVal;
    ctx.log(`Set variable {{${varName}}} = "${resolvedVal}"`, 'info');
    return { output: resolvedVal };
  },

  'data_transform': async (data, ctx) => {
    const targetVar = data.variableName || 'transformed';
    const inputVal = VariableEngine.resolve(data.input, ctx.variables);
    const operation = data.operation || 'trim';

    let result: any = inputVal;
    if (operation === 'trim') result = String(inputVal).trim();
    if (operation === 'uppercase') result = String(inputVal).toUpperCase();
    if (operation === 'lowercase') result = String(inputVal).toLowerCase();
    if (operation === 'parseJson') {
      try { result = JSON.parse(String(inputVal)); } catch { result = inputVal; }
    }
    if (operation === 'stringify') result = JSON.stringify(inputVal);

    ctx.variables[targetVar] = result;
    ctx.log(`✓ Transformed data [${operation}] -> {{${targetVar}}}`, 'success');
    return { output: result };
  },

  // -------------------------------------------------------------
  // FILES
  // -------------------------------------------------------------
  'file_upload': async (data, ctx) => {
    const filePath = data.filePath || path.join(DOWNLOADS_DIR, 'sample.txt');
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || { css: 'input[type="file"]' }, 8000);
    ctx.log(`Uploading file: ${filePath}...`, 'info');
    await locator.setInputFiles(filePath);
    ctx.log('✓ File uploaded', 'success');
    return {};
  },

  'file_download': async (data, ctx) => {
    const { locator } = await SelectorEngine.findElement(ctx.page, data.selector || data, 8000);
    ctx.log('Waiting for file download trigger...', 'info');
    const [download] = await Promise.all([
      ctx.page.waitForEvent('download', { timeout: 30000 }),
      locator.click()
    ]);
    const suggestedName = download.suggestedFilename();
    const savePath = path.join(DOWNLOADS_DIR, suggestedName);
    await download.saveAs(savePath);
    ctx.log(`✓ Downloaded file saved to: ${savePath}`, 'success');
    ctx.variables['lastDownloadedFile'] = savePath;
    return { output: savePath };
  },

  'file_save_json': async (data, ctx) => {
    const filename = data.filename || `export_${Date.now()}.json`;
    const targetPath = path.join(DOWNLOADS_DIR, filename);
    const content = typeof data.data === 'string'
      ? VariableEngine.resolve(data.data, ctx.variables)
      : ctx.variables;
    fs.writeFileSync(targetPath, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
    ctx.log(`✓ Saved JSON file to ${targetPath}`, 'success');
    return { output: targetPath };
  },

  'file_save_csv': async (data, ctx) => {
    const filename = data.filename || `export_${Date.now()}.csv`;
    const targetPath = path.join(DOWNLOADS_DIR, filename);
    const varName = data.variableName || 'extractedTable';
    const rows = ctx.variables[varName];

    let csvContent = '';
    if (Array.isArray(rows) && rows.length > 0) {
      const headers = Object.keys(rows[0]);
      csvContent += headers.join(',') + '\n';
      rows.forEach((r: any) => {
        const line = headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',');
        csvContent += line + '\n';
      });
    }
    fs.writeFileSync(targetPath, csvContent, 'utf8');
    ctx.log(`✓ Saved CSV file (${Array.isArray(rows) ? rows.length : 0} rows) to ${targetPath}`, 'success');
    return { output: targetPath };
  },

  // -------------------------------------------------------------
  // SERVICES & WEBHOOKS
  // -------------------------------------------------------------
  'service_discord': async (data, ctx) => {
    const webhookUrl = VariableEngine.resolve(data.webhookUrl, ctx.variables);
    const content = VariableEngine.resolve(data.message || 'Automated message from FlowPilot 🚀', ctx.variables);
    ctx.log(`Sending message to Discord webhook...`, 'info');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, username: 'FlowPilot Automation' })
    });
    if (!res.ok) {
      throw new Error(`Discord Webhook failed with status ${res.status}`);
    }
    ctx.log('✓ Discord notification sent successfully', 'success');
    return {};
  },

  'service_webhook': async (data, ctx) => {
    const url = VariableEngine.resolve(data.url, ctx.variables);
    const method = data.method || 'POST';
    const rawBody = data.body ? VariableEngine.resolve(data.body, ctx.variables) : undefined;
    let body = rawBody;
    if (body && typeof body === 'object') body = JSON.stringify(body);

    ctx.log(`Dispatching HTTP ${method} to ${url}...`, 'info');
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(data.headers || {}) },
      body: method !== 'GET' && method !== 'HEAD' ? body : undefined
    });
    const responseText = await res.text();
    ctx.log(`✓ Webhook returned status ${res.status}`, 'success');
    return { output: responseText };
  },

  // -------------------------------------------------------------
  // ZERO-API-KEY CODE & SCRIPTING ENGINES
  // -------------------------------------------------------------
  'code_python': async (data, ctx) => {
    const code = data.code || '# Write your Python code here\n# Use flow.get("key"), flow.set("key", val), flow.output(res)\nresult = "Hello from Python!"\nflow.set("pythonResult", result)\nprint("Python computation complete")';
    const outputVar = data.variableName || 'pythonOutput';

    ctx.log('🐍 Executing local Python script (Zero API Key)...', 'info');
    const res = await runPythonScript(code, ctx.variables, (msg, lvl) => ctx.log(msg, lvl));

    // Merge any updated variables back to workflow execution context
    Object.keys(res.updatedVariables).forEach((k) => {
      ctx.variables[k] = res.updatedVariables[k];
    });

    if (res.output !== undefined && res.output !== null) {
      ctx.variables[outputVar] = res.output;
    }

    ctx.log(`✓ Python completed. Updated ${Object.keys(res.updatedVariables).length} variables.`, 'success');
    return { output: res.output ?? res.updatedVariables };
  },

  'code_javascript': async (data, ctx) => {
    const code = data.code || '// Write JavaScript / Node.js code\n// Access variables, flow.get(), flow.set(), fetch(), crypto\nconst data = flow.get("inputData") || "Sample";\nconst upper = String(data).toUpperCase();\nflow.set("jsOutput", upper);\nreturn { processed: upper, timestamp: new Date().toISOString() };';
    const outputVar = data.variableName || 'jsOutput';

    ctx.log('⚡ Executing local JavaScript / Node.js snippet...', 'info');
    const res = await runJavaScriptScript(code, ctx.variables, (msg, lvl) => ctx.log(msg, lvl));

    Object.keys(res.updatedVariables).forEach((k) => {
      ctx.variables[k] = res.updatedVariables[k];
    });

    if (res.output !== undefined && res.output !== null) {
      ctx.variables[outputVar] = res.output;
    }

    ctx.log(`✓ JavaScript completed.`, 'success');
    return { output: res.output ?? res.updatedVariables };
  },

  'action_cli_command': async (data, ctx) => {
    const rawCmd = data.command || 'echo "FlowPilot CLI execution"';
    const resolvedCmd = VariableEngine.resolve(rawCmd, ctx.variables);
    const varName = data.variableName || 'cliOutput';

    ctx.log(`💻 Executing system CLI command: ${resolvedCmd}`, 'info');
    const res = await runCliCommand(resolvedCmd, data.cwd, (msg, lvl) => ctx.log(msg, lvl));

    const resultObj = {
      stdout: res.stdout.trim(),
      stderr: res.stderr.trim(),
      exitCode: res.exitCode
    };

    ctx.variables[varName] = resultObj;
    ctx.variables[`${varName}_stdout`] = resultObj.stdout;

    if (res.exitCode !== 0 && !data.continueOnError) {
      throw new Error(`CLI Command failed with exit code ${res.exitCode}: ${res.stderr}`);
    }

    return { output: resultObj };
  },

  // -------------------------------------------------------------
  // FREE WEB SCRAPERS & FEEDS (NO API KEYS)
  // -------------------------------------------------------------
  'data_http_scrape': async (data, ctx) => {
    const rawUrl = data.url || 'https://news.ycombinator.com';
    let url = VariableEngine.resolve(rawUrl, ctx.variables);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const varName = data.variableName || 'scrapedData';
    const mode = data.mode || 'text'; // 'text' | 'html' | 'links' | 'headings' | 'regex'
    const pattern = data.pattern ? VariableEngine.resolve(data.pattern, ctx.variables) : '';

    ctx.log(`🌐 Fast HTTP Scraping (0-Browser) from: ${url}...`, 'info');
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ...(data.headers || {})
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Web Scraper request failed with status ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    let result: any = null;

    if (mode === 'html') {
      result = html;
    } else if (mode === 'headings') {
      const headings: string[] = [];
      const matches = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi) || [];
      matches.forEach(m => {
        const clean = m.replace(/<[^>]+>/g, '').trim();
        if (clean) headings.push(clean);
      });
      result = headings;
    } else if (mode === 'links') {
      const links: Array<{ text: string; href: string }> = [];
      const matches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi) || [];
      matches.forEach(m => {
        const hrefMatch = m.match(/href=["']([^"']+)["']/i);
        const textClean = m.replace(/<[^>]+>/g, '').trim();
        if (hrefMatch && hrefMatch[1]) {
          let fullHref = hrefMatch[1];
          if (fullHref.startsWith('/')) {
            try {
              const parsed = new URL(url);
              fullHref = `${parsed.origin}${fullHref}`;
            } catch {}
          }
          links.push({ text: textClean, href: fullHref });
        }
      });
      result = links;
    } else if (mode === 'regex' && pattern) {
      const regex = new RegExp(pattern, 'gi');
      const matches = Array.from(html.matchAll(regex)).map(m => m[1] || m[0]);
      result = matches;
    } else {
      // Clean plain text
      const clean = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      result = clean.substring(0, 100000);
    }

    ctx.variables[varName] = result;
    ctx.log(`✓ Scraped data saved to {{${varName}}} (Found ${Array.isArray(result) ? result.length : (typeof result === 'string' ? result.length + ' chars' : '1 item')})`, 'success');
    return { output: result };
  },

  'data_rss_feed': async (data, ctx) => {
    const rawUrl = data.url || 'https://news.ycombinator.com/rss';
    let url = VariableEngine.resolve(rawUrl, ctx.variables);
    const limit = parseInt(data.limit || '10', 10);
    const varName = data.variableName || 'rssItems';

    ctx.log(`📡 Fetching RSS / Atom feed from: ${url}...`, 'info');
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlowPilot RSS Reader/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch RSS feed (Status ${res.status})`);
    }

    const xml = await res.text();
    const items: Array<{ title: string; link: string; description: string; pubDate: string; author?: string }> = [];
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];

    for (let i = 0; i < Math.min(itemMatches.length, limit); i++) {
      const raw = itemMatches[i];
      const getTag = (tag: string) => {
        const match = raw.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return (match ? (match[1] || match[2] || '') : '').trim();
      };
      const getAttr = (tag: string, attr: string) => {
        const match = raw.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i'));
        return match ? match[1] : '';
      };

      const title = getTag('title') || 'Untitled';
      const link = getTag('link') || getAttr('link', 'href') || '';
      let description = getTag('description') || getTag('summary') || getTag('content');
      description = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const pubDate = getTag('pubDate') || getTag('published') || getTag('updated') || new Date().toISOString();
      const author = getTag('author') || getTag('dc:creator');

      items.push({ title, link, description, pubDate, author });
    }

    ctx.variables[varName] = items;
    ctx.log(`✓ Extracted ${items.length} RSS feed items into {{${varName}}}`, 'success');
    return { output: items };
  },

  // -------------------------------------------------------------
  // LOCAL FILES & SYSTEM STORAGE
  // -------------------------------------------------------------
  'data_file_read': async (data, ctx) => {
    const rawPath = VariableEngine.resolve(data.filePath, ctx.variables);
    const targetPath = path.isAbsolute(rawPath) ? rawPath : path.join(DOWNLOADS_DIR, rawPath);
    const varName = data.variableName || 'fileContent';
    const parseAs = data.parseAs || 'text'; // 'text' | 'json' | 'lines'

    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found: ${targetPath}`);
    }

    ctx.log(`Reading local file: ${targetPath}...`, 'info');
    const rawContent = fs.readFileSync(targetPath, 'utf8');
    let parsed: any = rawContent;

    if (parseAs === 'json') {
      try { parsed = JSON.parse(rawContent); } catch (e: any) { throw new Error(`Failed to parse JSON file: ${e.message}`); }
    } else if (parseAs === 'lines') {
      parsed = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    }

    ctx.variables[varName] = parsed;
    ctx.log(`✓ File read successfully (${rawContent.length} bytes) -> {{${varName}}}`, 'success');
    return { output: parsed };
  },

  'data_file_write': async (data, ctx) => {
    const rawPath = VariableEngine.resolve(data.filePath || data.filename || `output_${Date.now()}.txt`, ctx.variables);
    const targetPath = path.isAbsolute(rawPath) ? rawPath : path.join(DOWNLOADS_DIR, rawPath);
    const rawContent = data.content !== undefined ? VariableEngine.resolve(data.content, ctx.variables) : (data.data || '');
    const mode = data.mode || 'overwrite'; // 'overwrite' | 'append'

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let finalContent = typeof rawContent === 'object' ? JSON.stringify(rawContent, null, 2) : String(rawContent);
    if (mode === 'append' && fs.existsSync(targetPath)) {
      fs.appendFileSync(targetPath, '\n' + finalContent, 'utf8');
      ctx.log(`✓ Appended content to file: ${targetPath}`, 'success');
    } else {
      fs.writeFileSync(targetPath, finalContent, 'utf8');
      ctx.log(`✓ Saved content to file: ${targetPath}`, 'success');
    }

    return { output: targetPath };
  },

  // -------------------------------------------------------------
  // FREE LOCAL AI (OLLAMA - 0 API KEYS)
  // -------------------------------------------------------------
  'ai_ollama_local': async (data, ctx) => {
    const endpoint = VariableEngine.resolve(data.endpoint || 'http://localhost:11434', ctx.variables).replace(/\/$/, '');
    const model = VariableEngine.resolve(data.model || 'llama3', ctx.variables);
    const prompt = VariableEngine.resolve(data.prompt || 'Summarize the given text: {{inputData}}', ctx.variables);
    const systemPrompt = data.systemPrompt ? VariableEngine.resolve(data.systemPrompt, ctx.variables) : undefined;
    const varName = data.variableName || 'aiResponse';

    ctx.log(`🤖 Querying local Ollama AI (${model}) at ${endpoint}...`, 'info');

    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature: parseFloat(data.temperature || '0.7')
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Ollama request failed with status ${res.status}. Is Ollama running on ${endpoint}?`);
      }

      const json = await res.json() as any;
      const reply = json.response || '';
      ctx.variables[varName] = reply;
      ctx.log(`✓ Ollama AI response generated successfully -> {{${varName}}}`, 'success');
      return { output: reply };
    } catch (err: any) {
      ctx.log(`Local AI Error: ${err.message}. (Ensure Ollama is running via 'ollama serve' or use Python/Node.js scripting node instead)`, 'error');
      throw err;
    }
  },

  // -------------------------------------------------------------
  // ADVANCED LOGIC: ARRAY LOOP
  // -------------------------------------------------------------
  'logic_loop': async (data, ctx) => {
    const arrayName = data.arrayName || 'items';
    const items = ctx.variables[arrayName] || (Array.isArray(data.items) ? data.items : []);
    const loopIndex = parseInt(ctx.variables['$loopIndex'] || '0', 10);

    if (!Array.isArray(items) || items.length === 0 || loopIndex >= items.length) {
      ctx.log(`Loop finished for {{${arrayName}}} (${items?.length || 0} items processed)`, 'info');
      ctx.variables['$loopIndex'] = 0;
      return { nextHandle: 'done', output: { completed: true, total: items?.length || 0 } };
    }

    const currentItem = items[loopIndex];
    ctx.variables['currentItem'] = currentItem;
    ctx.variables['currentIndex'] = loopIndex;
    ctx.variables['$loopIndex'] = loopIndex + 1;

    ctx.log(`🔁 Iteration ${loopIndex + 1}/${items.length}: Processing item`, 'info');
    return { nextHandle: 'each', output: { item: currentItem, index: loopIndex, total: items.length } };
  }
};

