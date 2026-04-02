'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, AlertCircle, ExternalLink } from 'lucide-react';

interface PaymentProvider {
  id: string;
  provider: string;
  displayName: string | null;
  enabled: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
}

const PROVIDER_INFO: Record<string, {
  name: string;
  description: string;
  color: string;
  logo: string;
  configFields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  docsUrl: string;
}> = {
  stripe: {
    name: 'Stripe',
    description: 'Industry-standard payment processing. Supports cards, Apple Pay, Google Pay, and more.',
    color: '#635BFF',
    logo: 'S',
    configFields: [
      { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
    ],
    docsUrl: 'https://stripe.com/docs',
  },
  fanbasis: {
    name: 'Fanbasis',
    description: 'Creator-focused payment platform with built-in subscriptions, discount codes, and customer management.',
    color: '#FF6B35',
    logo: 'F',
    configFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your Fanbasis API key', secret: true },
      { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'Your webhook signing secret', secret: true },
    ],
    docsUrl: 'https://www.fanbasis.com',
  },
};

export default function PaymentsPage() {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  const [configEdits, setConfigEdits] = useState<Record<string, Record<string, string>>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payment-providers');
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load payment providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleEnabled(provider: PaymentProvider) {
    const newEnabled = !provider.enabled;

    // Don't allow disabling the only enabled provider
    if (!newEnabled && provider.isDefault) {
      setError('Cannot disable the default payment provider. Set another provider as default first.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSaving(provider.id);
    try {
      const res = await fetch('/api/admin/payment-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: provider.id,
          enabled: newEnabled,
          // If disabling and it was default, unset default
          ...((!newEnabled && provider.isDefault) && { isDefault: false }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(null);
    }
  }

  async function setDefault(provider: PaymentProvider) {
    if (provider.isDefault || !provider.enabled) return;

    setSaving(provider.id);
    try {
      const res = await fetch('/api/admin/payment-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: provider.id, isDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(null);
    }
  }

  async function saveConfig(provider: PaymentProvider) {
    const edits = configEdits[provider.provider];
    if (!edits) return;

    setSaving(provider.id);
    try {
      const mergedConfig = { ...(provider.config as Record<string, unknown>), ...edits };
      const res = await fetch('/api/admin/payment-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: provider.id, config: mergedConfig }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setSaved(provider.id);
      setTimeout(() => setSaved(null), 2000);
      setConfigEdits(prev => {
        const next = { ...prev };
        delete next[provider.provider];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(null);
    }
  }

  function updateConfigField(providerKey: string, fieldKey: string, value: string) {
    setConfigEdits(prev => ({
      ...prev,
      [providerKey]: { ...(prev[providerKey] ?? {}), [fieldKey]: value },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-maxxed-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Providers</h1>
        <p className="text-gray-500 mt-1">Configure which payment processors are available for checkout.</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {providers.map((provider) => {
          const info = PROVIDER_INFO[provider.provider];
          if (!info) return null;
          const isExpanded = expandedConfig === provider.provider;
          const edits = configEdits[provider.provider] ?? {};
          const hasEdits = Object.keys(edits).length > 0;

          return (
            <Card key={provider.id} className={`transition-all ${provider.enabled ? 'ring-1 ring-gray-200' : 'opacity-60'}`}>
              <CardContent className="p-0">
                {/* Provider header */}
                <div className="p-6 flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                      style={{ background: info.color }}
                    >
                      {info.logo}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="font-bold text-gray-900 text-lg">{info.name}</h2>
                        {provider.isDefault && (
                          <span className="text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-maxxed-blue text-white">
                            Default
                          </span>
                        )}
                        {provider.enabled && !provider.isDefault && (
                          <span className="text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Enabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 max-w-md">{info.description}</p>

                      {/* Action links */}
                      <div className="flex items-center gap-4 mt-3">
                        {provider.enabled && !provider.isDefault && (
                          <button
                            onClick={() => setDefault(provider)}
                            disabled={saving === provider.id}
                            className="text-xs font-medium text-maxxed-blue hover:underline"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedConfig(isExpanded ? null : provider.provider)}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          {isExpanded ? 'Hide Config' : 'Configure'}
                        </button>
                        <a
                          href={info.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                          Docs <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleEnabled(provider)}
                    disabled={saving === provider.id}
                    className="flex-shrink-0"
                  >
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${provider.enabled ? 'bg-maxxed-blue' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${provider.enabled ? 'translate-x-5' : ''}`} />
                    </div>
                  </button>
                </div>

                {/* Config panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-5 bg-gray-50/50">
                    <div className="space-y-4">
                      {info.configFields.map((field) => {
                        const currentValue = edits[field.key] ?? (provider.config as Record<string, string>)[field.key] ?? '';
                        return (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            <input
                              type={field.secret ? 'password' : 'text'}
                              value={currentValue}
                              onChange={(e) => updateConfigField(provider.provider, field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                            />
                          </div>
                        );
                      })}

                      <p className="text-xs text-gray-400">
                        API keys are stored in the database. For production, set these via environment variables instead.
                      </p>
                    </div>

                    {hasEdits && (
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => saveConfig(provider)}
                          disabled={saving === provider.id}
                          className="flex items-center gap-2 bg-maxxed-blue text-white font-bold text-xs tracking-wide uppercase px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {saving === provider.id ? 'Saving...' : saved === provider.id ? (
                            <><Check className="w-3.5 h-3.5" /> Saved</>
                          ) : 'Save Config'}
                        </button>
                        <button
                          onClick={() => setConfigEdits(prev => {
                            const next = { ...prev };
                            delete next[provider.provider];
                            return next;
                          })}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info note */}
      <div className="mt-8 rounded-lg bg-blue-50/50 border border-blue-100 px-5 py-4">
        <p className="text-sm text-blue-800 font-medium">How payment providers work</p>
        <ul className="mt-2 space-y-1 text-sm text-blue-700/80">
          <li>• The <strong>default</strong> provider is used for all new checkouts</li>
          <li>• Multiple providers can be enabled at once — only one is the default</li>
          <li>• Existing enrollments processed through a provider continue to work even if disabled</li>
          <li>• Stripe uses environment variables (<code className="text-xs bg-blue-100 px-1 rounded">STRIPE_SECRET_KEY</code>) — config here is optional override</li>
        </ul>
      </div>
    </div>
  );
}
