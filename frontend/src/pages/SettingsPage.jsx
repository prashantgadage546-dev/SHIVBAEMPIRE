// =============================================================
// SHIVBAEMPIRE — Settings Page (Admin)
// =============================================================
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/settings')
      .then(r => setSettings(r.data.data || {}))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings saved successfully.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'org_name', label: 'Organization Name', placeholder: 'Shivba Tarun Mitra Mandal' },
    { key: 'contact_email', label: 'Contact Email', placeholder: 'contact@shivbaempire.com' },
    { key: 'contact_phone', label: 'Contact Phone', placeholder: '9999000000' },
    { key: 'address', label: 'Address', placeholder: 'Organization address', multiline: true },
    { key: 'receipt_prefix', label: 'Receipt Prefix', placeholder: 'YAT' },
    { key: 'receipt_year', label: 'Receipt Year', placeholder: '2026' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Application configuration</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Organization Settings</h2>
        {loading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded" />)}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {fields.map(({ key, label, placeholder, multiline }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                {multiline ? (
                  <textarea
                    className="form-input"
                    rows={3}
                    value={settings[key] || ''}
                    onChange={e => setSettings(s => ({...s, [key]: e.target.value}))}
                    placeholder={placeholder}
                  />
                ) : (
                  <input
                    className="form-input"
                    value={settings[key] || ''}
                    onChange={e => setSettings(s => ({...s, [key]: e.target.value}))}
                    placeholder={placeholder}
                  />
                )}
              </div>
            ))}
            <div className="pt-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Application Info</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Application</span>
            <span className="font-medium">SHIVBAEMPIRE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Organization</span>
            <span className="font-medium">Shivba Tarun Mitra Mandal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
