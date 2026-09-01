import React, { useEffect, useState } from 'react';
import { Key, Plus, ShieldCheck, Trash2, Copy, Check, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Credential } from '../../types/workflow.js';

export const CredentialsPage: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'login' | 'api_key' | 'secret' | 'payment'>('login');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const list = await api.getCredentials();
      setCredentials(list || []);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !secret) return;
    try {
      await api.createCredential({
        name,
        type,
        username_or_key: username || undefined,
        secret
      });
      setName('');
      setUsername('');
      setSecret('');
      setIsAddModalOpen(false);
      loadCredentials();
    } catch (err: any) {
      alert(`Failed to save credential: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    try {
      await api.deleteCredential(id);
      loadCredentials();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const copyRefToken = (credId: string) => {
    const token = `{{credentials.${credId}.password}}`;
    navigator.clipboard.writeText(token);
    setCopiedId(credId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 mb-1">
            <ShieldCheck className="w-3 h-3" />
            <span>AES-256-GCM Encrypted Storage</span>
          </div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Credentials & Secrets</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Securely store login passwords and secrets. Workflows reference IDs instead of hardcoded plaintext values.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md hover:shadow-glow-brand transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Credential</span>
        </button>
      </div>

      {/* Security Advisory */}
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
        <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <div className="font-semibold mb-0.5">Zero Plaintext Leakage</div>
          <p className="text-[11px] text-surface-600 dark:text-surface-400 leading-relaxed">
            All stored passwords, tokens, and payment identifiers are encrypted using AES-256-GCM. When exporting or sharing workflow JSON files, secret values are never included.
          </p>
        </div>
      </div>

      {/* Credentials Table / Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-surface-400">Loading credentials...</div>
      ) : credentials.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-400 mx-auto flex items-center justify-center">
            <Key className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-surface-900 dark:text-white">No credentials stored</div>
          <p className="text-xs text-surface-400 max-w-sm mx-auto">
            Add a website login or API key to securely inject credentials into workflow form nodes.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Credential</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-subtle flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-surface-900 dark:text-white">{cred.name}</h3>
                      <span className="text-[10px] uppercase font-semibold text-surface-400">{cred.type}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(cred.id)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-surface-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {cred.username_or_key && (
                  <div className="text-[11px] text-surface-600 dark:text-surface-300 font-mono bg-surface-50 dark:bg-surface-800 px-2 py-1 rounded">
                    User: {cred.username_or_key}
                  </div>
                )}

                <div className="text-[11px] text-surface-400 font-mono bg-surface-50 dark:bg-surface-800 px-2 py-1 rounded">
                  Secret: {cred.masked_secret}
                </div>
              </div>

              <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-[11px]">
                <span className="text-surface-400 font-mono">{cred.id}</span>
                <button
                  onClick={() => copyRefToken(cred.id)}
                  className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  {copiedId === cred.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === cred.id ? 'Copied Token!' : 'Copy Variable'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Add Encrypted Credential</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Credential Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amazon Main Store Login"
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="login">Website Login (Username/Email + Password)</option>
                  <option value="api_key">API Key / Bearer Token</option>
                  <option value="secret">Custom Secret Value</option>
                  <option value="payment">Test Payment Card / CVV</option>
                </select>
              </div>

              {(type === 'login' || type === 'api_key') && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    {type === 'login' ? 'Email or Username' : 'API Key Identifier'}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  {type === 'login' ? 'Password' : 'Secret Value'}
                </label>
                <input
                  type="password"
                  required
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter secret to encrypt"
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm"
              >
                Save & Encrypt
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
