import { Router } from 'express';
import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export const templateRouter = Router();

export const STARTER_TEMPLATES = [
  {
    id: 'tpl_daily_login',
    title: 'Daily Website Login & Keepalive',
    description: 'Automatically visits a web portal, authenticates using encrypted credentials, and verifies active dashboard session.',
    category: 'Authentication',
    icon: 'LogIn',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_schedule',
        position: { x: 300, y: 50 },
        data: { label: 'Daily at 08:00 AM', type: 'trigger_schedule', cron: '0 8 * * *' }
      },
      {
        id: 'node_2',
        type: 'browser_open_url',
        position: { x: 300, y: 170 },
        data: { label: 'Open Login Portal', type: 'browser_open_url', url: 'https://example.com/login', waitUntil: 'domcontentloaded' }
      },
      {
        id: 'node_3',
        type: 'form_email',
        position: { x: 300, y: 290 },
        data: { label: 'Enter Email', type: 'form_email', email: 'user@example.com', selector: { placeholder: 'Email' } }
      },
      {
        id: 'node_4',
        type: 'form_password',
        position: { x: 300, y: 410 },
        data: { label: 'Enter Password', type: 'form_password', password: 'demoPassword123', selector: { placeholder: 'Password' } }
      },
      {
        id: 'node_5',
        type: 'interaction_click',
        position: { x: 300, y: 530 },
        data: { label: 'Click Sign In', type: 'interaction_click', selector: { role: 'button', roleName: 'Sign In', text: 'Sign In' } }
      },
      {
        id: 'node_6',
        type: 'browser_screenshot',
        position: { x: 300, y: 650 },
        data: { label: 'Capture Dashboard', type: 'browser_screenshot' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true },
      { id: 'e3-4', source: 'node_3', target: 'node_4', animated: true },
      { id: 'e4-5', source: 'node_4', target: 'node_5', animated: true },
      { id: 'e5-6', source: 'node_5', target: 'node_6', animated: true }
    ],
    variables: {}
  },
  {
    id: 'tpl_ecommerce_cart',
    title: 'E-Commerce Product Cart & Quantity Automation',
    description: 'Searches for an item, navigates to product detail, selects size/options, sets target quantity using smart fallback strategies, and adds to cart.',
    category: 'E-Commerce',
    icon: 'ShoppingCart',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_manual',
        position: { x: 300, y: 50 },
        data: { label: 'Manual Trigger', type: 'trigger_manual' }
      },
      {
        id: 'node_2',
        type: 'browser_open_url',
        position: { x: 300, y: 170 },
        data: { label: 'Open Store Catalog', type: 'browser_open_url', url: 'https://demo.playwright.dev/todomvc', waitUntil: 'domcontentloaded' }
      },
      {
        id: 'node_3',
        type: 'interaction_type_text',
        position: { x: 300, y: 290 },
        data: { label: 'Search Item', type: 'interaction_type_text', text: 'Premium Ergonomic Chair', pressEnter: true, selector: { placeholder: 'What needs to be done?' } }
      },
      {
        id: 'node_4',
        type: 'action_set_quantity',
        position: { x: 300, y: 410 },
        data: { label: 'Set Quantity to 3', type: 'action_set_quantity', quantity: 3, strategy: 'auto' }
      },
      {
        id: 'node_5',
        type: 'browser_screenshot',
        position: { x: 300, y: 530 },
        data: { label: 'Capture Confirmation', type: 'browser_screenshot' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true },
      { id: 'e3-4', source: 'node_3', target: 'node_4', animated: true },
      { id: 'e4-5', source: 'node_4', target: 'node_5', animated: true }
    ],
    variables: { productQuery: 'Ergonomic Chair', targetQuantity: 3 }
  },
  {
    id: 'tpl_data_scraper',
    title: 'Lead & Table Data Scraper to CSV',
    description: 'Scrapes structured table or list data from target web pages, transforms fields, and exports directly to CSV on disk.',
    category: 'Data & Scraping',
    icon: 'Table',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_manual',
        position: { x: 300, y: 50 },
        data: { label: 'Start Scraping', type: 'trigger_manual' }
      },
      {
        id: 'node_2',
        type: 'browser_open_url',
        position: { x: 300, y: 170 },
        data: { label: 'Open Data Directory', type: 'browser_open_url', url: 'https://news.ycombinator.com', waitUntil: 'domcontentloaded' }
      },
      {
        id: 'node_3',
        type: 'data_extract_links',
        position: { x: 300, y: 290 },
        data: { label: 'Extract Articles & URLs', type: 'data_extract_links', variableName: 'articles', selector: { css: '.titleline > a' } }
      },
      {
        id: 'node_4',
        type: 'file_save_json',
        position: { x: 300, y: 410 },
        data: { label: 'Save JSON Export', type: 'file_save_json', filename: 'hacker_news_top.json' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true },
      { id: 'e3-4', source: 'node_3', target: 'node_4', animated: true }
    ],
    variables: {}
  },
  {
    id: 'tpl_discord_monitor',
    title: 'Website Stock / Price Alert to Discord',
    description: 'Checks element on website, evaluates conditional logic, and dispatches rich alert to Discord channel webhook.',
    category: 'Monitoring & Alerts',
    icon: 'BellRing',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_schedule',
        position: { x: 300, y: 50 },
        data: { label: 'Every 30 Minutes', type: 'trigger_schedule', cron: '*/30 * * * *' }
      },
      {
        id: 'node_2',
        type: 'browser_open_url',
        position: { x: 300, y: 170 },
        data: { label: 'Check Status Page', type: 'browser_open_url', url: 'https://example.com' }
      },
      {
        id: 'node_3',
        type: 'data_extract_text',
        position: { x: 300, y: 290 },
        data: { label: 'Extract Price / Status', type: 'data_extract_text', variableName: 'pageTitle', selector: { css: 'h1' } }
      },
      {
        id: 'node_4',
        type: 'service_discord',
        position: { x: 300, y: 410 },
        data: { label: 'Notify Discord', type: 'service_discord', webhookUrl: 'https://discord.com/api/webhooks/...', message: 'Status verified: {{pageTitle}} at {{$timestamp}}' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true },
      { id: 'e3-4', source: 'node_3', target: 'node_4', animated: true }
    ],
    variables: {}
  },
  {
    id: 'tpl_python_scraper',
    title: '🐍 Python Web Scraper & Price Analytics (Zero API Key)',
    description: 'Fetches raw web data with 0 browser overhead, extracts articles and prices using Python, cleans data, and exports directly to CSV on disk without any paid APIs.',
    category: 'Zero-Key Python & Scraping',
    icon: 'Code2',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_manual',
        position: { x: 300, y: 50 },
        data: { label: 'Start Python Pipeline', type: 'trigger_manual' }
      },
      {
        id: 'node_2',
        type: 'data_http_scrape',
        position: { x: 300, y: 170 },
        data: { label: 'Scrape Webpage HTML', type: 'data_http_scrape', url: 'https://news.ycombinator.com', mode: 'html', variableName: 'rawHtml' }
      },
      {
        id: 'node_3',
        type: 'code_python',
        position: { x: 300, y: 290 },
        data: {
          label: 'Python Data Parser & Cleaner',
          type: 'code_python',
          code: `# Parse titles and links using Python regex & string tools\nimport re\n\nhtml = flow.get('rawHtml', '')\npattern = r'<span class="titleline"><a href="([^"]+)">([^<]+)</a>'\nmatches = re.findall(pattern, html)\n\nitems = []\nfor link, title in matches[:15]:\n    items.append({\n        'title': title.strip(),\n        'link': link,\n        'domain': link.split('/')[2] if '://' in link else 'local'\n    })\n\nprint(f"Extracted {len(items)} items using Python standard library!")\nflow.set('parsedArticles', items)\nflow.output({'total': len(items), 'first': items[0] if items else None})`,
          variableName: 'pythonSummary'
        }
      },
      {
        id: 'node_4',
        type: 'file_save_json',
        position: { x: 300, y: 410 },
        data: { label: 'Save Processed JSON', type: 'file_save_json', filename: 'python_scraped_news.json', data: '{{parsedArticles}}' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true },
      { id: 'e3-4', source: 'node_3', target: 'node_4', animated: true }
    ],
    variables: {}
  },
  {
    id: 'tpl_nodejs_rss',
    title: '⚡ Node.js RSS News Aggregator & Webhook Dispatcher',
    description: 'Reads multiple RSS feeds with zero API key, aggregates top stories using Node.js array filtering, and formats a markdown digest.',
    category: 'Zero-Key JavaScript',
    icon: 'Radio',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_schedule',
        position: { x: 300, y: 50 },
        data: { label: 'Hourly Trigger', type: 'trigger_schedule', cron: '0 * * * *' }
      },
      {
        id: 'node_2',
        type: 'data_rss_feed',
        position: { x: 300, y: 170 },
        data: { label: 'Fetch Tech News RSS', type: 'data_rss_feed', url: 'https://news.ycombinator.com/rss', limit: 8, variableName: 'feedItems' }
      },
      {
        id: 'node_3',
        type: 'code_javascript',
        position: { x: 300, y: 290 },
        data: {
          label: 'Node.js Digest Formatter',
          type: 'code_javascript',
          code: `const items = flow.get('feedItems') || [];\nconsole.log(\`Formatting \${items.length} RSS stories...\`);\n\nconst formatted = items.map((item, idx) => {\n  return \`\${idx + 1}. **[\${item.title}](\${item.link})**\\n📅 \${item.pubDate}\`;\n}).join('\\n\\n');\n\nconst digest = \`📰 **Daily Tech Digest** (\${new Date().toLocaleDateString()})\\n\\n\${formatted}\`;\nflow.set('newsDigest', digest);\nreturn { summaryCount: items.length, sampleDigest: digest };`,
          variableName: 'digestResult'
        }
      },
      {
        id: 'node_4',
        type: 'data_file_write',
        position: { x: 300, y: 410 },
        data: { label: 'Save Markdown Digest', type: 'data_file_write', filePath: 'news_digest.md', content: '{{newsDigest}}', mode: 'overwrite' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true },
      { id: 'e3-4', source: 'node_3', target: 'node_4', animated: true }
    ],
    variables: {}
  },
  {
    id: 'tpl_ollama_ai',
    title: '🤖 Free Local AI Text Summarizer (Ollama - 0 API Key)',
    description: 'Scrapes web content and routes it to your local Ollama instance (Llama 3 / Mistral / DeepSeek) for 100% free offline AI analysis without sending data to cloud APIs.',
    category: 'Free Local AI',
    icon: 'Sparkles',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_manual',
        position: { x: 300, y: 50 },
        data: { label: 'Start Free AI Analysis', type: 'trigger_manual' }
      },
      {
        id: 'node_2',
        type: 'data_http_scrape',
        position: { x: 300, y: 170 },
        data: { label: 'Fetch Article Content', type: 'data_http_scrape', url: 'https://news.ycombinator.com', mode: 'text', variableName: 'rawArticle' }
      },
      {
        id: 'node_3',
        type: 'ai_ollama_local',
        position: { x: 300, y: 290 },
        data: {
          label: 'Local Ollama LLM (Zero Cost)',
          type: 'ai_ollama_local',
          endpoint: 'http://localhost:11434',
          model: 'llama3',
          prompt: 'Please provide a 3-bullet point executive summary of the top news from this webpage:\n\n{{rawArticle}}',
          temperature: '0.5',
          variableName: 'localAiSummary'
        }
      },
      {
        id: 'node_4',
        type: 'data_file_write',
        position: { x: 300, y: 410 },
        data: { label: 'Save AI Summary', type: 'data_file_write', filePath: 'ai_summary.txt', content: '{{localAiSummary}}' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true },
      { id: 'e3-4', source: 'node_3', target: 'node_4', animated: true }
    ],
    variables: {}
  },
  {
    id: 'tpl_cli_batch',
    title: '💻 System CLI & Local Script Runner Automation',
    description: 'Executes local shell commands, git operations, or batch scripts, analyzes command output with JavaScript, and logs results.',
    category: 'System & CLI',
    icon: 'Terminal',
    nodes: [
      {
        id: 'node_1',
        type: 'trigger_manual',
        position: { x: 300, y: 50 },
        data: { label: 'Run System Task', type: 'trigger_manual' }
      },
      {
        id: 'node_2',
        type: 'action_cli_command',
        position: { x: 300, y: 170 },
        data: { label: 'Execute Shell Command', type: 'action_cli_command', command: 'git status || dir || ls', variableName: 'gitStatus' }
      },
      {
        id: 'node_3',
        type: 'code_javascript',
        position: { x: 300, y: 290 },
        data: {
          label: 'Analyze CLI Output',
          type: 'code_javascript',
          code: `const cli = flow.get('gitStatus') || {};\nconsole.log(\`CLI Exit Code: \${cli.exitCode}\`);\n\nconst isClean = cli.stdout.includes('nothing to commit') || cli.stdout.includes('clean');\nflow.set('repoIsClean', isClean);\nreturn { isClean, outputSnippet: (cli.stdout || '').substring(0, 120) };`,
          variableName: 'analysisResult'
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true },
      { id: 'e2-3', source: 'node_2', target: 'node_3', animated: true }
    ],
    variables: {}
  }
];

templateRouter.get('/', (req, res) => {
  res.json({ success: true, data: STARTER_TEMPLATES });
});

templateRouter.post('/:id/clone', (req, res) => {
  try {
    const tpl = STARTER_TEMPLATES.find(t => t.id === req.params.id);
    if (!tpl) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const id = `wf_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO workflows (id, name, description, trigger_type, nodes_json, edges_json, variables_json, is_active, tags, created_at, updated_at)
      VALUES (?, ?, ?, 'manual', ?, ?, ?, 1, ?, ?, ?)
    `).run(
      id,
      tpl.title,
      tpl.description,
      JSON.stringify(tpl.nodes),
      JSON.stringify(tpl.edges),
      JSON.stringify(tpl.variables || {}),
      JSON.stringify([tpl.category]),
      now,
      now
    );

    res.status(201).json({ success: true, data: { id, name: tpl.title } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
