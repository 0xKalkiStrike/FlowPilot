import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Copy,
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code2,
  Terminal,
  Globe,
  Radio,
  FileText,
  Save,
  Sparkles,
  Repeat,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkle
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext.js';
import { NODE_DEFINITIONS } from '../../lib/nodeDefinitions.js';
import { IconRenderer } from '../common/IconRenderer.js';
import { api } from '../../lib/api.js';
import { Credential } from '../../types/workflow.js';

const PYTHON_PRESETS = [
  {
    label: '🕷️ Web Scraping & Regex Parser',
    code: `# Scrape and extract articles/links using Python standard library
import re

html = flow.get("rawHtml") or flow.get("scrapedContent") or '<a href="https://example.com">Example Article</a>'
pattern = r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]+)</a>'
matches = re.findall(pattern, html)

results = []
for link, text in matches[:10]:
    clean_text = text.strip()
    if clean_text:
        results.append({"title": clean_text, "url": link})

print(f"Extracted {len(results)} links from content")
flow.set("extractedArticles", results)
flow.output({"total": len(results), "items": results})`
  },
  {
    label: '📊 Data Cleaning & Stats Calculator',
    code: `# Calculate stats and normalize data array
import math

numbers = flow.get("dataPoints") or [12, 45, 67, 89, 23, 56, 78, 90]
avg = sum(numbers) / len(numbers)
std_dev = math.sqrt(sum((x - avg) ** 2 for x in numbers) / len(numbers))

summary = {
    "count": len(numbers),
    "sum": sum(numbers),
    "average": round(avg, 2),
    "min": min(numbers),
    "max": max(numbers),
    "std_dev": round(std_dev, 2)
}

print(f"Computed summary: Avg={summary['average']}, Max={summary['max']}")
flow.set("statsSummary", summary)
flow.output(summary)`
  },
  {
    label: '📧 Extract Emails & Phone Numbers',
    code: `# Regex extractor for contact information
import re

text = flow.get("scrapedText") or "Contact us at support@example.com or sales@flowpilot.org. Call +1-800-555-0199"

emails = list(set(re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)))
phones = list(set(re.findall(r'\\+?[0-9]{1,3}?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{3,4}[-.\\s]?[0-9]{3,4}', text)))

contacts = {"emails": emails, "phones": phones}
print(f"Found {len(emails)} emails and {len(phones)} phone numbers")
flow.set("extractedContacts", contacts)
flow.output(contacts)`
  },
  {
    label: '🧹 Clean & Deduplicate JSON Records',
    code: `# Clean and deduplicate dictionary/list records
records = flow.get("rawRecords") or [
    {"id": 1, "name": " Alice ", "active": "true"},
    {"id": 1, "name": "Alice", "active": "true"},
    {"id": 2, "name": " Bob", "active": "false"}
]

seen_ids = set()
clean = []
for r in records:
    rid = r.get("id")
    if rid not in seen_ids:
        seen_ids.add(rid)
        clean.append({
            "id": rid,
            "name": r.get("name", "").strip(),
            "active": str(r.get("active")).lower() == "true"
        })

print(f"Deduplicated from {len(records)} to {len(clean)} records")
flow.set("cleanedRecords", clean)
flow.output(clean)`
  }
];

const JS_PRESETS = [
  {
    label: '🔄 Map & Filter Array Records',
    code: `// Map and filter items using modern JavaScript
const items = flow.get('items') || [
  { name: 'Server A', latency: 45, status: 'online' },
  { name: 'Server B', latency: 120, status: 'online' },
  { name: 'Server C', latency: 999, status: 'offline' }
];

console.log(\`Analyzing \${items.length} server nodes...\`);
const onlineFast = items.filter(s => s.status === 'online' && s.latency < 100);

flow.set('healthyServers', onlineFast);
return { total: items.length, healthy: onlineFast.length, servers: onlineFast };`
  },
  {
    label: '💬 Format Discord / Slack Markdown Payload',
    code: `// Format a rich notification message
const title = flow.get('jobTitle') || 'Automation Pipeline';
const data = flow.get('summary') || { processed: 42, errors: 0 };

const message = [
  \`🚀 **\${title} Completed**\`,
  \`📅 Timestamp: \${new Date().toLocaleString()}\`,
  \`📊 Items Processed: **\${data.processed}**\`,
  \`⚠️ Errors: **\${data.errors}**\`,
  \`✨ Status: \${data.errors === 0 ? '🟢 ALL GREEN' : '🔴 REQUIRES ATTENTION'}\`
].join('\\n');

flow.set('discordPayload', message);
return { formattedMessage: message };`
  },
  {
    label: '🔐 Crypto Hash & Signature Generator',
    code: `// Generate SHA-256 hash using Node crypto
const raw = flow.get('inputString') || 'FlowPilot-Visual-Automation-2026';
const hash = crypto.createHash('sha256').update(raw).digest('hex');

console.log('Generated hash:', hash);
flow.set('generatedHash', hash);
return { input: raw, sha256: hash };`
  },
  {
    label: '📅 Date Formatter & Expiry Calculator',
    code: `// Date manipulation and relative expiry calculation
const now = new Date();
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

const dateInfo = {
  currentIso: now.toISOString(),
  currentFormatted: now.toLocaleDateString(),
  expiresAt: nextWeek.toISOString(),
  daysRemaining: 7
};

flow.set('dateInfo', dateInfo);
return dateInfo;`
  }
];

export const NodeConfigPanel: React.FC = () => {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNodeData, deleteNode, duplicateNode, workflow } = useWorkflow();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showAdvancedSelectors, setShowAdvancedSelectors] = useState(false);

  // Test Node State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testTab, setTestTab] = useState<'output' | 'logs'>('output');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  useEffect(() => {
    api.getCredentials().then(setCredentials).catch(() => {});
  }, []);

  useEffect(() => {
    // Reset test result when switching nodes
    setTestResult(null);
  }, [selectedNodeId]);

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-surface-200 dark:border-surface-800 bg-white/60 dark:bg-surface-900/60 backdrop-blur-md flex flex-col h-[calc(100vh-3.5rem)] items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <div className="text-sm font-semibold text-surface-900 dark:text-white mb-1">
          No Node Selected
        </div>
        <p className="text-xs text-surface-400 max-w-xs">
          Click any node on the workflow canvas to configure its parameters, write custom Python/JS scripts, and test steps interactively.
        </p>
      </aside>
    );
  }

  const nodeType = selectedNode.type || selectedNode.data?.type;
  const def = NODE_DEFINITIONS[nodeType] || {
    label: selectedNode.data?.label || 'Node',
    icon: 'CircleDot',
    color: '#0c8ee9',
    category: 'CUSTOM'
  };

  const data = selectedNode.data || {};

  const handleChange = (key: string, value: any) => {
    updateNodeData(selectedNode.id, { [key]: value });
  };

  const handleSelectorChange = (field: string, val: string) => {
    const currentSelector = typeof data.selector === 'object' ? { ...data.selector } : { text: '' };
    currentSelector[field] = val;
    updateNodeData(selectedNode.id, { selector: currentSelector });
  };

  const insertVariable = (varToken: string, field: string = 'text') => {
    const current = data[field] || '';
    handleChange(field, `${current}{{${varToken}}}`);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testNode(nodeType, data, workflow?.variables || {});
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message,
        logs: [{ timestamp: new Date().toISOString(), message: err.message, level: 'error' }],
        duration: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <aside className="w-84 sm:w-96 border-l border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Header */}
      <div className="p-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: def.color }}
          >
            <IconRenderer name={def.icon} className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-surface-900 dark:text-white truncate">
              {data.label || def.label}
            </div>
            <div className="text-[10px] text-surface-400 font-mono truncate">{nodeType}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateNode(selectedNode.id)}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
            title="Duplicate node"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteNode(selectedNode.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-surface-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSelectedNodeId(null)}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Test Bar */}
      <div className="px-3 py-2 bg-surface-50 dark:bg-surface-950/50 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 flex items-center gap-1.5">
          <Sparkle className="w-3.5 h-3.5 text-brand-500" />
          <span>Interactive Test Step</span>
        </span>
        <button
          onClick={handleRunTest}
          disabled={isTesting}
          className="flex items-center gap-1.5 px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Testing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Step</span>
            </>
          )}
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Node Label */}
        <div>
          <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
            Display Label
          </label>
          <input
            type="text"
            value={data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* ============================================================== */}
        {/* PYTHON SCRIPT NODE (0 API KEY) */}
        {/* ============================================================== */}
        {nodeType === 'code_python' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Python Script (Local Runtime)</span>
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono font-bold">
                Zero API Key
              </span>
            </div>

            {/* Presets dropdown */}
            <div>
              <label className="block text-[10px] text-surface-400 mb-1">Load Preset Snippet:</label>
              <select
                onChange={(e) => {
                  const p = PYTHON_PRESETS.find(x => x.label === e.target.value);
                  if (p) handleChange('code', p.code);
                }}
                defaultValue=""
                className="w-full px-2.5 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="" disabled>Select Python Template...</option>
                {PYTHON_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Python Code Editor */}
            <div className="rounded-xl overflow-hidden border border-surface-300 dark:border-surface-700 shadow-inner bg-[#1e1e1e]">
              <div className="px-3 py-1.5 bg-[#2d2d2d] flex items-center justify-between text-[10px] text-surface-400 font-mono border-b border-[#3d3d3d]">
                <span className="text-blue-400 font-bold">main.py</span>
                <span>Python 3.x Environment</span>
              </div>
              <textarea
                value={data.code || ''}
                onChange={(e) => handleChange('code', e.target.value)}
                rows={12}
                placeholder="# Write Python code here..."
                className="w-full p-3 bg-transparent text-[#d4d4d4] font-mono text-xs focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>

            <div className="text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-800/60 p-2.5 rounded-lg space-y-1">
              <div className="font-bold text-surface-600 dark:text-surface-300">🐍 Python Flow Helpers:</div>
              <div>• <code className="font-mono text-brand-500">flow.get("varName", default)</code> to read variable</div>
              <div>• <code className="font-mono text-brand-500">flow.set("varName", value)</code> to save variable</div>
              <div>• <code className="font-mono text-brand-500">print(...)</code> outputs live to execution log</div>
              <div>• <code className="font-mono text-brand-500">flow.output(data)</code> sets node output result</div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Output Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || 'pythonResult'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* JAVASCRIPT / NODE.JS NODE (0 API KEY) */}
        {/* ============================================================== */}
        {nodeType === 'code_javascript' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-yellow-500" />
                <span>Node.js / JavaScript Code</span>
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono font-bold">
                Zero API Key
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-surface-400 mb-1">Load Preset Snippet:</label>
              <select
                onChange={(e) => {
                  const p = JS_PRESETS.find(x => x.label === e.target.value);
                  if (p) handleChange('code', p.code);
                }}
                defaultValue=""
                className="w-full px-2.5 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="" disabled>Select JavaScript Template...</option>
                {JS_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="rounded-xl overflow-hidden border border-surface-300 dark:border-surface-700 shadow-inner bg-[#1e1e1e]">
              <div className="px-3 py-1.5 bg-[#2d2d2d] flex items-center justify-between text-[10px] text-surface-400 font-mono border-b border-[#3d3d3d]">
                <span className="text-yellow-400 font-bold">script.js</span>
                <span>Node.js Async Context</span>
              </div>
              <textarea
                value={data.code || ''}
                onChange={(e) => handleChange('code', e.target.value)}
                rows={12}
                placeholder="// Write JavaScript code here..."
                className="w-full p-3 bg-transparent text-[#d4d4d4] font-mono text-xs focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>

            <div className="text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-800/60 p-2.5 rounded-lg space-y-1">
              <div className="font-bold text-surface-600 dark:text-surface-300">⚡ JS Injected Objects:</div>
              <div>• <code className="font-mono text-yellow-500">flow.get()</code>, <code className="font-mono text-yellow-500">flow.set()</code></div>
              <div>• <code className="font-mono text-yellow-500">fetch()</code>, <code className="font-mono text-yellow-500">crypto</code>, <code className="font-mono text-yellow-500">Buffer</code></div>
              <div>• Return any value to pass to downstream nodes</div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Output Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || 'jsResult'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FAST HTTP WEB SCRAPER */}
        {/* ============================================================== */}
        {nodeType === 'data_http_scrape' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Target Webpage URL
              </label>
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://news.ycombinator.com"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Extraction Mode
              </label>
              <select
                value={data.mode || 'text'}
                onChange={(e) => handleChange('mode', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
              >
                <option value="text">Clean Plain Text (Stripped of HTML)</option>
                <option value="html">Raw HTML Source</option>
                <option value="links">All Links Array [{'{ text, href }'}]</option>
                <option value="headings">All Headings Array (H1, H2, H3)</option>
                <option value="regex">Custom Regex Pattern Matches</option>
              </select>
            </div>

            {data.mode === 'regex' && (
              <div>
                <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                  Regex Pattern
                </label>
                <input
                  type="text"
                  value={data.pattern || ''}
                  onChange={(e) => handleChange('pattern', e.target.value)}
                  placeholder="<h2[^>]*>(.*?)</h2>"
                  className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Save Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || 'scrapedContent'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* RSS FEED READER */}
        {/* ============================================================== */}
        {nodeType === 'data_rss_feed' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                RSS / Atom Feed URL
              </label>
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://news.ycombinator.com/rss"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Max Articles to Fetch
              </label>
              <input
                type="number"
                value={data.limit || 10}
                onChange={(e) => handleChange('limit', parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Save Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || 'rssItems'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FREE LOCAL AI (OLLAMA) */}
        {/* ============================================================== */}
        {nodeType === 'ai_ollama_local' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider">
                Local Ollama AI Settings
              </label>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded font-mono font-bold">
                100% Free Offline
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-surface-500 mb-1">Ollama Host Endpoint</label>
              <input
                type="text"
                value={data.endpoint || 'http://localhost:11434'}
                onChange={(e) => handleChange('endpoint', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-surface-500 mb-1">Model Name</label>
              <input
                type="text"
                value={data.model || 'llama3'}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="llama3, mistral, phi3, deepseek-r1"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-surface-500 mb-1">Prompt / Instructions</label>
              <textarea
                value={data.prompt || ''}
                onChange={(e) => handleChange('prompt', e.target.value)}
                rows={4}
                placeholder="Summarize the following text:\n\n{{inputData}}"
                className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Save Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || 'aiSummary'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CLI COMMAND NODE */}
        {/* ============================================================== */}
        {nodeType === 'action_cli_command' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Shell Command
              </label>
              <input
                type="text"
                value={data.command || ''}
                onChange={(e) => handleChange('command', e.target.value)}
                placeholder="git status, python script.py, curl ..."
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Working Directory (Optional)
              </label>
              <input
                type="text"
                value={data.cwd || ''}
                onChange={(e) => handleChange('cwd', e.target.value)}
                placeholder="C:\my-project or leave empty for workspace"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Save Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || 'cliOutput'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* LOCAL FILE READ / WRITE */}
        {/* ============================================================== */}
        {nodeType === 'data_file_read' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                File Path
              </label>
              <input
                type="text"
                value={data.filePath || ''}
                onChange={(e) => handleChange('filePath', e.target.value)}
                placeholder="data.json or C:\path\file.txt"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Parse Format
              </label>
              <select
                value={data.parseAs || 'json'}
                onChange={(e) => handleChange('parseAs', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
              >
                <option value="json">Parsed JSON Object / Array</option>
                <option value="text">Raw Plain Text</option>
                <option value="lines">Lines Array [String]</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Save Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || 'fileContent'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {nodeType === 'data_file_write' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                File Path / Name
              </label>
              <input
                type="text"
                value={data.filePath || ''}
                onChange={(e) => handleChange('filePath', e.target.value)}
                placeholder="output.txt or export.json"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Write Mode
              </label>
              <select
                value={data.mode || 'overwrite'}
                onChange={(e) => handleChange('mode', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
              >
                <option value="overwrite">Overwrite File</option>
                <option value="append">Append to End of File</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Content / Variable Token
              </label>
              <textarea
                value={data.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                rows={4}
                placeholder="{{pythonResult}} or text content"
                className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* LOOP FOR-EACH ARRAY */}
        {/* ============================================================== */}
        {nodeType === 'logic_loop' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Array Variable Name to Iterate
              </label>
              <div className="flex items-center">
                <span className="px-2.5 py-1.5 bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-mono rounded-l-lg border border-r-0 border-surface-200 dark:border-surface-700">
                  {'{{'}
                </span>
                <input
                  type="text"
                  value={data.arrayName || 'items'}
                  onChange={(e) => handleChange('arrayName', e.target.value)}
                  placeholder="items or articles"
                  className="flex-1 px-2.5 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-r-lg text-xs font-mono text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span className="ml-1 text-xs text-surface-400 font-mono">{'}}'}</span>
              </div>
            </div>

            <div className="text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-800/60 p-2.5 rounded-lg space-y-1">
              <div className="font-bold text-surface-600 dark:text-surface-300">🔁 Loop Details:</div>
              <div>• Connect the <strong className="text-pink-500">For Each Item</strong> handle to the task loop</div>
              <div>• Downstream nodes access <code className="font-mono text-brand-500">{'{{currentItem}}'}</code> & <code className="font-mono text-brand-500">{'{{currentIndex}}'}</code></div>
              <div>• Connect the <strong className="text-emerald-500">Completed</strong> handle to post-loop action</div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BROWSER URL & OPTIONS */}
        {/* ============================================================== */}
        {nodeType === 'browser_open_url' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Wait Strategy
              </label>
              <select
                value={data.waitUntil || 'domcontentloaded'}
                onChange={(e) => handleChange('waitUntil', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
              >
                <option value="domcontentloaded">DOM Content Loaded (Fast)</option>
                <option value="load">Full Window Load</option>
                <option value="networkidle">Network Idle (Wait for APIs)</option>
              </select>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* INTERACTION / FORMS: SELECTORS & INPUT */}
        {/* ============================================================== */}
        {(nodeType.startsWith('interaction_') || nodeType.startsWith('form_') || nodeType === 'data_extract_text') && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                Target Element Text / Label
              </label>
              <input
                type="text"
                value={data.selector?.text || ''}
                onChange={(e) => handleSelectorChange('text', e.target.value)}
                placeholder="e.g. 'Submit', 'Add to Cart', 'Username'"
                className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedSelectors(!showAdvancedSelectors)}
                className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 hover:underline"
              >
                {showAdvancedSelectors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{showAdvancedSelectors ? 'Hide Advanced Selectors' : 'CSS / XPath / Placeholder Selectors'}</span>
              </button>

              {showAdvancedSelectors && (
                <div className="mt-2 p-2.5 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-200 dark:border-surface-700/60 space-y-2">
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-0.5">Placeholder</label>
                    <input
                      type="text"
                      value={data.selector?.placeholder || ''}
                      onChange={(e) => handleSelectorChange('placeholder', e.target.value)}
                      placeholder="e.g. 'Enter your email'"
                      className="w-full px-2 py-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-xs text-surface-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-0.5">CSS Selector</label>
                    <input
                      type="text"
                      value={data.selector?.css || ''}
                      onChange={(e) => handleSelectorChange('css', e.target.value)}
                      placeholder="e.g. button.btn-primary"
                      className="w-full px-2 py-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-xs text-surface-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Input Value for Typing */}
            {(nodeType === 'interaction_type_text' || nodeType === 'form_input') && (
              <div>
                <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1">
                  Text to Type
                </label>
                <input
                  type="text"
                  value={data.text || ''}
                  onChange={(e) => handleChange('text', e.target.value)}
                  placeholder="Text to type into input"
                  className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
                />
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* INTERACTIVE TEST RESULT DISPLAY */}
        {/* ============================================================== */}
        {testResult && (
          <div className="rounded-xl border border-surface-200 dark:border-surface-700/80 bg-surface-50/80 dark:bg-surface-950/80 overflow-hidden shadow-sm animate-in fade-in">
            <div className="p-2.5 bg-surface-100 dark:bg-surface-800/80 border-b border-surface-200 dark:border-surface-700/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-bold text-surface-900 dark:text-white">
                  {testResult.success ? 'Test Successful' : 'Test Failed'}
                </span>
                {testResult.duration !== undefined && (
                  <span className="text-[10px] text-surface-400 font-mono">({testResult.duration}ms)</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTestTab('output')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    testTab === 'output'
                      ? 'bg-brand-500 text-white'
                      : 'text-surface-500 hover:text-surface-800 dark:hover:text-white'
                  }`}
                >
                  Output
                </button>
                <button
                  onClick={() => setTestTab('logs')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    testTab === 'logs'
                      ? 'bg-brand-500 text-white'
                      : 'text-surface-500 hover:text-surface-800 dark:hover:text-white'
                  }`}
                >
                  Logs ({testResult.logs?.length || 0})
                </button>
              </div>
            </div>

            <div className="p-2.5 max-h-56 overflow-y-auto font-mono text-[11px]">
              {testTab === 'output' ? (
                testResult.error ? (
                  <div className="text-red-500 whitespace-pre-wrap">{testResult.error}</div>
                ) : (
                  <pre className="text-surface-800 dark:text-surface-200 whitespace-pre-wrap">
                    {typeof testResult.output === 'object'
                      ? JSON.stringify(testResult.output, null, 2)
                      : String(testResult.output ?? 'Node executed with no explicit return value')}
                  </pre>
                )
              ) : (
                <div className="space-y-1">
                  {testResult.logs && testResult.logs.length > 0 ? (
                    testResult.logs.map((log: any, idx: number) => (
                      <div
                        key={idx}
                        className={`text-[10px] ${
                          log.level === 'error'
                            ? 'text-red-500'
                            : log.level === 'warn'
                            ? 'text-amber-500'
                            : log.level === 'success'
                            ? 'text-emerald-500'
                            : 'text-surface-600 dark:text-surface-300'
                        }`}
                      >
                        {log.message}
                      </div>
                    ))
                  ) : (
                    <div className="text-surface-400">No logs captured.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* RESILIENCE & ERROR HANDLING */}
        {/* ============================================================== */}
        {!nodeType.startsWith('trigger_') && (
          <div className="pt-3 border-t border-surface-200 dark:border-surface-800 space-y-2.5">
            <div className="text-[11px] font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Resilience & Error Handling</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-surface-500 mb-1">Max Retries</label>
                <select
                  value={data.retries || 0}
                  onChange={(e) => handleChange('retries', parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-xs text-surface-900 dark:text-white"
                >
                  <option value="0">0 (No retry)</option>
                  <option value="1">1 attempt</option>
                  <option value="2">2 attempts</option>
                  <option value="3">3 attempts</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-surface-500 mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  step="1000"
                  value={data.timeout || 8000}
                  onChange={(e) => handleChange('timeout', parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-xs text-surface-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={Boolean(data.continueOnError)}
                onChange={(e) => handleChange('continueOnError', e.target.checked)}
                className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Continue workflow if this node fails</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};
