export interface NodeDefinition {
  type: string;
  category: 'CODE' | 'TRIGGERS' | 'BROWSER' | 'INTERACTION' | 'FORMS' | 'PAYMENT' | 'LOGIC' | 'DATA' | 'FILES' | 'SERVICES';
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultData: Record<string, any>;
  hasMultipleOutputs?: boolean;
  outputHandles?: { id: string; label: string; color?: string }[];
}

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  // TRIGGERS
  'trigger_manual': {
    type: 'trigger_manual',
    category: 'TRIGGERS',
    label: 'Manual Trigger',
    description: 'Start workflow manually via Run button or API',
    icon: 'PlayCircle',
    color: '#0c8ee9',
    defaultData: { label: 'Manual Trigger' }
  },
  'trigger_schedule': {
    type: 'trigger_schedule',
    category: 'TRIGGERS',
    label: 'Schedule Trigger',
    description: 'Run workflow on a recurring cron interval',
    icon: 'Clock',
    color: '#8b5cf6',
    defaultData: { label: 'Schedule Trigger', cron: '0 9 * * *', frequency: 'daily', time: '09:00' }
  },
  'trigger_webhook': {
    type: 'trigger_webhook',
    category: 'TRIGGERS',
    label: 'Webhook Trigger',
    description: 'Execute workflow upon incoming HTTP request',
    icon: 'Webhook',
    color: '#10b981',
    defaultData: { label: 'Webhook Trigger' }
  },

  // BROWSER
  'browser_open_url': {
    type: 'browser_open_url',
    category: 'BROWSER',
    label: 'Open URL',
    description: 'Navigate browser to website URL',
    icon: 'Globe',
    color: '#0284c7',
    defaultData: { label: 'Open URL', url: 'https://', waitUntil: 'domcontentloaded', timeout: 30000 }
  },
  'browser_go_back': {
    type: 'browser_go_back',
    category: 'BROWSER',
    label: 'Go Back',
    description: 'Navigate to previous page in browser history',
    icon: 'ArrowLeft',
    color: '#0284c7',
    defaultData: { label: 'Go Back' }
  },
  'browser_go_forward': {
    type: 'browser_go_forward',
    category: 'BROWSER',
    label: 'Go Forward',
    description: 'Navigate forward in browser history',
    icon: 'ArrowRight',
    color: '#0284c7',
    defaultData: { label: 'Go Forward' }
  },
  'browser_reload': {
    type: 'browser_reload',
    category: 'BROWSER',
    label: 'Reload Page',
    description: 'Refresh the active browser tab',
    icon: 'RotateCw',
    color: '#0284c7',
    defaultData: { label: 'Reload Page' }
  },
  'browser_new_tab': {
    type: 'browser_new_tab',
    category: 'BROWSER',
    label: 'New Tab',
    description: 'Open a new browser tab',
    icon: 'PlusSquare',
    color: '#0284c7',
    defaultData: { label: 'New Tab', url: '' }
  },
  'browser_close_tab': {
    type: 'browser_close_tab',
    category: 'BROWSER',
    label: 'Close Tab',
    description: 'Close current browser tab',
    icon: 'XSquare',
    color: '#0284c7',
    defaultData: { label: 'Close Tab' }
  },
  'browser_switch_tab': {
    type: 'browser_switch_tab',
    category: 'BROWSER',
    label: 'Switch Tab',
    description: 'Switch active tab by index',
    icon: 'Layers',
    color: '#0284c7',
    defaultData: { label: 'Switch Tab', tabIndex: 0 }
  },
  'browser_wait': {
    type: 'browser_wait',
    category: 'BROWSER',
    label: 'Wait / Delay',
    description: 'Pause execution for specified milliseconds',
    icon: 'Hourglass',
    color: '#eab308',
    defaultData: { label: 'Wait Delay', duration: 2000 }
  },
  'browser_wait_for_element': {
    type: 'browser_wait_for_element',
    category: 'BROWSER',
    label: 'Wait For Element',
    description: 'Wait until element is visible, attached, or hidden',
    icon: 'Eye',
    color: '#0284c7',
    defaultData: { label: 'Wait For Element', state: 'visible', timeout: 10000, selector: { text: '' } }
  },
  'browser_scroll': {
    type: 'browser_scroll',
    category: 'BROWSER',
    label: 'Scroll Page',
    description: 'Scroll page up, down, top, or bottom',
    icon: 'ChevronsDown',
    color: '#0284c7',
    defaultData: { label: 'Scroll Down', direction: 'down', distance: 500 }
  },
  'browser_screenshot': {
    type: 'browser_screenshot',
    category: 'BROWSER',
    label: 'Take Screenshot',
    description: 'Capture screenshot of the page or element',
    icon: 'Camera',
    color: '#0284c7',
    defaultData: { label: 'Take Screenshot' }
  },

  // INTERACTION
  'interaction_click': {
    type: 'interaction_click',
    category: 'INTERACTION',
    label: 'Click',
    description: 'Click button, link, or any UI element',
    icon: 'MousePointerClick',
    color: '#f97316',
    defaultData: { label: 'Click Element', selector: { text: '' }, timeout: 8000 }
  },
  'interaction_double_click': {
    type: 'interaction_double_click',
    category: 'INTERACTION',
    label: 'Double Click',
    description: 'Double click on targeted element',
    icon: 'MousePointerClick',
    color: '#f97316',
    defaultData: { label: 'Double Click', selector: { text: '' } }
  },
  'interaction_right_click': {
    type: 'interaction_right_click',
    category: 'INTERACTION',
    label: 'Right Click',
    description: 'Context click on element',
    icon: 'MousePointer',
    color: '#f97316',
    defaultData: { label: 'Right Click', selector: { text: '' } }
  },
  'interaction_hover': {
    type: 'interaction_hover',
    category: 'INTERACTION',
    label: 'Hover',
    description: 'Move mouse cursor over element',
    icon: 'Hand',
    color: '#f97316',
    defaultData: { label: 'Hover Element', selector: { text: '' } }
  },
  'interaction_type_text': {
    type: 'interaction_type_text',
    category: 'INTERACTION',
    label: 'Type Text',
    description: 'Type text or variable into input field',
    icon: 'Keyboard',
    color: '#f97316',
    defaultData: { label: 'Type Text', text: '', clearFirst: true, pressEnter: false, selector: { placeholder: '' } }
  },
  'interaction_clear': {
    type: 'interaction_clear',
    category: 'INTERACTION',
    label: 'Clear Input',
    description: 'Erase current value from input field',
    icon: 'Eraser',
    color: '#f97316',
    defaultData: { label: 'Clear Input', selector: { placeholder: '' } }
  },
  'interaction_press_key': {
    type: 'interaction_press_key',
    category: 'INTERACTION',
    label: 'Press Key',
    description: 'Send special keyboard key (Enter, Tab, Escape)',
    icon: 'Command',
    color: '#f97316',
    defaultData: { label: 'Press Enter', key: 'Enter' }
  },
  'interaction_drag_drop': {
    type: 'interaction_drag_drop',
    category: 'INTERACTION',
    label: 'Drag & Drop',
    description: 'Drag one element onto another target',
    icon: 'Move',
    color: '#f97316',
    defaultData: { label: 'Drag & Drop', sourceSelector: {}, targetSelector: {} }
  },

  // FORMS
  'form_email': {
    type: 'form_email',
    category: 'FORMS',
    label: 'Email Input',
    description: 'Fill email field via direct input or credential',
    icon: 'Mail',
    color: '#10b981',
    defaultData: { label: 'Fill Email', email: '', selector: { placeholder: 'Email' } }
  },
  'form_password': {
    type: 'form_password',
    category: 'FORMS',
    label: 'Password Input',
    description: 'Safely autofill password using encrypted credential',
    icon: 'Lock',
    color: '#10b981',
    defaultData: { label: 'Fill Password', selector: { placeholder: 'Password' } }
  },
  'form_number': {
    type: 'form_number',
    category: 'FORMS',
    label: 'Number Input',
    description: 'Enter numerical values into field',
    icon: 'Hash',
    color: '#10b981',
    defaultData: { label: 'Enter Number', value: 1, selector: {} }
  },
  'form_checkbox': {
    type: 'form_checkbox',
    category: 'FORMS',
    label: 'Checkbox',
    description: 'Check or uncheck a checkbox element',
    icon: 'CheckSquare',
    color: '#10b981',
    defaultData: { label: 'Set Checkbox', checked: true, selector: {} }
  },
  'form_radio': {
    type: 'form_radio',
    category: 'FORMS',
    label: 'Radio Button',
    description: 'Select a single option from a radio group',
    icon: 'Disc',
    color: '#10b981',
    defaultData: { label: 'Select Radio', selector: {} }
  },
  'form_dropdown': {
    type: 'form_dropdown',
    category: 'FORMS',
    label: 'Dropdown / Select',
    description: 'Select an option from a HTML dropdown list',
    icon: 'ChevronDownSquare',
    color: '#10b981',
    defaultData: { label: 'Select Option', value: '', selector: {} }
  },

  // PAYMENT FORM ELEMENTS
  'payment_card_number': {
    type: 'payment_card_number',
    category: 'PAYMENT',
    label: 'Card Number',
    description: 'Autofill card number UI using encrypted secret',
    icon: 'CreditCard',
    color: '#6366f1',
    defaultData: { label: 'Card Number' }
  },
  'payment_expiry': {
    type: 'payment_expiry',
    category: 'PAYMENT',
    label: 'Expiry Date',
    description: 'Autofill expiration month/year (MM/YY)',
    icon: 'Calendar',
    color: '#6366f1',
    defaultData: { label: 'Expiry Date', expiry: '12/28' }
  },
  'payment_cvv': {
    type: 'payment_cvv',
    category: 'PAYMENT',
    label: 'CVV Security Code',
    description: 'Autofill CVV code UI safely',
    icon: 'Shield',
    color: '#6366f1',
    defaultData: { label: 'Enter CVV' }
  },
  'payment_cardholder': {
    type: 'payment_cardholder',
    category: 'PAYMENT',
    label: 'Name on Card',
    description: 'Autofill cardholder full name',
    icon: 'User',
    color: '#6366f1',
    defaultData: { label: 'Name on Card', name: 'John Doe' }
  },

  // QUANTITY
  'action_set_quantity': {
    type: 'action_set_quantity',
    category: 'INTERACTION',
    label: 'Set Quantity',
    description: 'Intelligently set quantity using buttons, input, or dropdown',
    icon: 'PlusMinus',
    color: '#ec4899',
    defaultData: { label: 'Set Quantity', quantity: 1, strategy: 'auto', minQuantity: 1, maxQuantity: 99 }
  },

  // LOGIC
  'logic_if': {
    type: 'logic_if',
    category: 'LOGIC',
    label: 'IF Condition',
    description: 'Branch execution based on variables or element visibility',
    icon: 'GitBranch',
    color: '#a855f7',
    hasMultipleOutputs: true,
    outputHandles: [
      { id: 'true', label: 'True', color: '#10b981' },
      { id: 'false', label: 'False', color: '#ef4444' }
    ],
    defaultData: { label: 'IF Condition', conditionType: 'variable', operator: 'equals', leftValue: '', rightValue: '' }
  },
  'logic_switch': {
    type: 'logic_switch',
    category: 'LOGIC',
    label: 'Switch Case',
    description: 'Multi-branch flow matching specific values',
    icon: 'Shuffle',
    color: '#a855f7',
    hasMultipleOutputs: true,
    outputHandles: [
      { id: 'case_1', label: 'Case 1' },
      { id: 'case_2', label: 'Case 2' },
      { id: 'default', label: 'Default', color: '#64748b' }
    ],
    defaultData: { label: 'Switch Case', value: '', cases: ['case_1', 'case_2'] }
  },
  'logic_human_pause': {
    type: 'logic_human_pause',
    category: 'LOGIC',
    label: 'Human Verification Pause',
    description: 'Pause workflow for CAPTCHA/MFA and notify user to resume',
    icon: 'UserCheck',
    color: '#f59e0b',
    defaultData: { label: 'Pause for Human', reason: 'Please solve the CAPTCHA in the browser' }
  },

  // DATA
  'data_extract_text': {
    type: 'data_extract_text',
    category: 'DATA',
    label: 'Extract Text',
    description: 'Scrape text from element and store in a variable',
    icon: 'FileText',
    color: '#14b8a6',
    defaultData: { label: 'Extract Text', variableName: 'myText', selector: { text: '' } }
  },
  'data_extract_attribute': {
    type: 'data_extract_attribute',
    category: 'DATA',
    label: 'Extract Attribute',
    description: 'Extract href, src, or data attribute from element',
    icon: 'Tag',
    color: '#14b8a6',
    defaultData: { label: 'Extract Attribute', attribute: 'href', variableName: 'myLink', selector: {} }
  },
  'data_extract_table': {
    type: 'data_extract_table',
    category: 'DATA',
    label: 'Extract Table',
    description: 'Scrape HTML table into structured JSON rows',
    icon: 'Table',
    color: '#14b8a6',
    defaultData: { label: 'Extract Table', variableName: 'tableData', selector: { css: 'table' } }
  },
  'data_extract_links': {
    type: 'data_extract_links',
    category: 'DATA',
    label: 'Extract All Links',
    description: 'Collect all matching anchor links from page',
    icon: 'Link',
    color: '#14b8a6',
    defaultData: { label: 'Extract Links', variableName: 'pageLinks', selector: { css: 'a[href]' } }
  },
  'data_set_variable': {
    type: 'data_set_variable',
    category: 'DATA',
    label: 'Set Variable',
    description: 'Assign or compute custom workflow variable',
    icon: 'Variable',
    color: '#14b8a6',
    defaultData: { label: 'Set Variable', name: 'myVar', value: 'Value' }
  },

  // FILES
  'file_upload': {
    type: 'file_upload',
    category: 'FILES',
    label: 'Upload File',
    description: 'Attach local file to file input element',
    icon: 'UploadCloud',
    color: '#3b82f6',
    defaultData: { label: 'Upload File', filePath: '', selector: { css: 'input[type="file"]' } }
  },
  'file_download': {
    type: 'file_download',
    category: 'FILES',
    label: 'Download File',
    description: 'Click button and wait for file download',
    icon: 'DownloadCloud',
    color: '#3b82f6',
    defaultData: { label: 'Download File', selector: { text: 'Download' } }
  },
  'file_save_json': {
    type: 'file_save_json',
    category: 'FILES',
    label: 'Save JSON File',
    description: 'Export extracted data to a local .json file',
    icon: 'FileJson',
    color: '#3b82f6',
    defaultData: { label: 'Save JSON', filename: 'data.json' }
  },
  'file_save_csv': {
    type: 'file_save_csv',
    category: 'FILES',
    label: 'Save CSV File',
    description: 'Export structured table rows to a .csv file',
    icon: 'FileSpreadsheet',
    color: '#3b82f6',
    defaultData: { label: 'Save CSV', variableName: 'tableData', filename: 'export.csv' }
  },
  'data_file_read': {
    type: 'data_file_read',
    category: 'FILES',
    label: 'Read Local File',
    description: 'Load text, JSON, or lines from local disk into variable',
    icon: 'FileText',
    color: '#3b82f6',
    defaultData: { label: 'Read File', filePath: 'data.json', parseAs: 'json', variableName: 'fileContent' }
  },
  'data_file_write': {
    type: 'data_file_write',
    category: 'FILES',
    label: 'Write / Append File',
    description: 'Save or append raw content or variables directly to local disk',
    icon: 'Save',
    color: '#3b82f6',
    defaultData: { label: 'Write File', filePath: 'output.txt', content: '{{myVar}}', mode: 'overwrite' }
  },

  // CODE & SCRIPTS (ZERO API KEY)
  'code_python': {
    type: 'code_python',
    category: 'CODE',
    label: 'Python Script (0-Key)',
    description: 'Run Python script locally with variable bridging and live stdout',
    icon: 'Code2',
    color: '#3b82f6',
    defaultData: {
      label: 'Python Script',
      code: `# Use flow.get("key"), flow.set("key", val), flow.output(data)\nimport math\n\ninput_data = flow.get("extractedText", "Hello FlowPilot")\nresult = f"Processed: {input_data.upper()}"\nflow.set("pythonResult", result)\nprint("Python computed:", result)\nflow.output({"result": result, "length": len(result)})`,
      variableName: 'pythonResult'
    }
  },
  'code_javascript': {
    type: 'code_javascript',
    category: 'CODE',
    label: 'Node.js / JavaScript (0-Key)',
    description: 'Execute sandboxed JavaScript with fetch, crypto, array & object tools',
    icon: 'FileCode2',
    color: '#eab308',
    defaultData: {
      label: 'JavaScript Code',
      code: `// Access flow.get(), flow.set(), fetch(), crypto\nconst data = flow.get('items') || [1, 2, 3, 4, 5];\nconst squared = data.map(n => n * n);\nflow.set('squaredNumbers', squared);\nconsole.log('Processed numbers:', squared);\nreturn { count: squared.length, results: squared };`,
      variableName: 'jsResult'
    }
  },
  'action_cli_command': {
    type: 'action_cli_command',
    category: 'FILES',
    label: 'Run Shell / CLI Command',
    description: 'Execute local command (bash, git, curl, ffmpeg) and capture output',
    icon: 'Terminal',
    color: '#64748b',
    defaultData: { label: 'Run CLI Command', command: 'git status', variableName: 'cliOutput' }
  },

  // FREE SCRAPING & FEEDS (NO API KEYS)
  'data_http_scrape': {
    type: 'data_http_scrape',
    category: 'DATA',
    label: 'Fast HTTP Web Scraper',
    description: 'Scrape web pages instantly without browser overhead using direct HTTP',
    icon: 'Globe',
    color: '#0ea5e9',
    defaultData: { label: 'Fast Web Scraper', url: 'https://news.ycombinator.com', mode: 'text', variableName: 'scrapedContent' }
  },
  'data_rss_feed': {
    type: 'data_rss_feed',
    category: 'DATA',
    label: 'RSS / Atom Feed Reader',
    description: 'Fetch and extract latest articles and posts from any RSS XML feed',
    icon: 'Radio',
    color: '#f97316',
    defaultData: { label: 'RSS Feed Reader', url: 'https://news.ycombinator.com/rss', limit: 10, variableName: 'rssItems' }
  },

  // FREE LOCAL AI
  'ai_ollama_local': {
    type: 'ai_ollama_local',
    category: 'SERVICES',
    label: 'Local Ollama AI (0-Key)',
    description: 'Run local LLM prompt (Llama 3, Mistral, DeepSeek) with zero cost or keys',
    icon: 'Sparkles',
    color: '#8b5cf6',
    defaultData: {
      label: 'Local Ollama AI',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
      prompt: 'Summarize the following text in 3 bullet points:\n\n{{inputData}}',
      temperature: '0.7',
      variableName: 'aiSummary'
    }
  },

  // LOGIC LOOP
  'logic_loop': {
    type: 'logic_loop',
    category: 'LOGIC',
    label: 'Loop / For-Each Array',
    description: 'Iterate over an array of items one by one for batch workflows',
    icon: 'Repeat',
    color: '#ec4899',
    hasMultipleOutputs: true,
    outputHandles: [
      { id: 'each', label: 'For Each Item', color: '#ec4899' },
      { id: 'done', label: 'Completed', color: '#10b981' }
    ],
    defaultData: { label: 'For-Each Loop', arrayName: 'items' }
  },

  // SERVICES
  'service_discord': {
    type: 'service_discord',
    category: 'SERVICES',
    label: 'Discord Webhook',
    description: 'Send custom notification message to Discord channel',
    icon: 'MessageSquare',
    color: '#5865F2',
    defaultData: { label: 'Discord Message', webhookUrl: '', message: 'Automation finished at {{$timestamp}}' }
  },
  'service_webhook': {
    type: 'service_webhook',
    category: 'SERVICES',
    label: 'HTTP Webhook Request',
    description: 'Make custom GET / POST / PUT API call',
    icon: 'Send',
    color: '#6366f1',
    defaultData: { label: 'HTTP Request', method: 'POST', url: 'https://', body: '{}' }
  }
};

export const CATEGORIES = [
  { id: 'CODE', label: '🐍 Zero-Key Code & Scripts', icon: 'Code2', count: 2 },
  { id: 'DATA', label: '📊 Free Scraping & Feeds', icon: 'Database', count: 7 },
  { id: 'LOGIC', label: '🔀 Logic & Loops', icon: 'GitMerge', count: 4 },
  { id: 'FILES', label: '📁 Files & CLI', icon: 'Folder', count: 7 },
  { id: 'SERVICES', label: '💬 Webhooks & Local AI', icon: 'Server', count: 3 },
  { id: 'TRIGGERS', label: '⚡ Triggers', icon: 'Zap', count: 3 },
  { id: 'BROWSER', label: '🌐 Browser Actions', icon: 'Globe', count: 11 },
  { id: 'INTERACTION', label: '🖱️ User Interactions', icon: 'MousePointer', count: 9 },
  { id: 'FORMS', label: '📝 Form Inputs', icon: 'FormInput', count: 6 },
  { id: 'PAYMENT', label: '💳 Payment Autofill', icon: 'CreditCard', count: 4 }
];

