import React, { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, RefreshCw, Cookie, Shield, Check } from 'lucide-react';
import { api } from '../../lib/api.js';
import { BrowserProfile } from '../../types/workflow.js';

export const ProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [clearingId, setClearingId] = useState<string | null>(null);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const list = await api.getProfiles();
      setProfiles(list || []);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.createProfile(name, userAgent || undefined);
      setName('');
      setUserAgent('');
      setIsAddModalOpen(false);
      loadProfiles();
    } catch (err: any) {
      alert(`Failed to create profile: ${err.message}`);
    }
  };

  const handleClear = async (id: string) => {
    if (!confirm('Clear all cookies and local storage session for this profile?')) return;
    setClearingId(id);
    try {
      await api.clearProfileSession(id);
      alert('Session data cleared successfully');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setClearingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      await api.deleteProfile(id);
      loadProfiles();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Browser Profiles</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Persistent browser contexts that preserve login sessions, cookies, and local storage.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md hover:shadow-glow-brand transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/40 text-xs text-brand-900 dark:text-brand-300 flex items-start gap-3">
        <Cookie className="w-4 h-4 shrink-0 mt-0.5 text-brand-600 dark:text-brand-400" />
        <div className="space-y-1">
          <div className="font-semibold">Reuse Authenticated Sessions</div>
          <p className="text-[11px] text-surface-600 dark:text-surface-400 leading-relaxed">
            When you run a workflow in a persistent profile, any login cookies, auth tokens, and cart state remain saved on disk. Future workflow runs will immediately recognize you as logged in without repeating the login steps.
          </p>
        </div>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-surface-400">Loading profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((prof) => (
            <div
              key={prof.id}
              className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-subtle flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-surface-900 dark:text-white">{prof.name}</h3>
                        {prof.is_default === 1 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-surface-400 font-mono">ID: {prof.id}</span>
                    </div>
                  </div>

                  {prof.is_default !== 1 && (
                    <button
                      onClick={() => handleDelete(prof.id)}
                      className="p-1 text-surface-400 hover:text-red-500 rounded transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-surface-500 dark:text-surface-400 font-mono bg-surface-50 dark:bg-surface-800/60 p-2 rounded-lg truncate">
                  Dir: data/browser_profiles/{prof.user_data_dir}
                </div>
              </div>

              <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                <span className="text-[10px] text-surface-400">
                  Created {new Date(prof.created_at).toLocaleDateString()}
                </span>

                <button
                  onClick={() => handleClear(prof.id)}
                  disabled={clearingId === prof.id}
                  className="flex items-center gap-1 text-xs text-surface-600 dark:text-surface-300 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${clearingId === prof.id ? 'animate-spin' : ''}`} />
                  <span>Clear Session</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Profile Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
              <Globe className="w-4 h-4 text-brand-500" />
              <span>Create Browser Profile</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Work Account Profile"
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Custom User-Agent (Optional)
                </label>
                <input
                  type="text"
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  placeholder="Leave empty for default Playwright Chrome user-agent"
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                Create Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
