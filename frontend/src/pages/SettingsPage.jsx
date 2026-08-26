// =============================================================
// SHIVBAEMPIRE — Settings Page (Admin)
// =============================================================
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPwd, setResetPwd] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const toast = useToast();
  const { t } = useLanguage();

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
      toast.success(t('settingsTitle') + ' — ' + t('save') + ' ✓');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    if (resetPwd !== '4593') {
      toast.error('चुकीचा Password! / Wrong Password!');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/settings/reset-all-data');
      toast.success('सर्व डेटा यशस्वीरीत्या क्लियर झाला! डॅशबोर्ड 0 झाला आहे.');
      setShowResetModal(false);
      setResetPwd('');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error('डेटा क्लियर करण्यात त्रुटी आली.');
    } finally {
      setResetLoading(false);
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
          <h1 className="page-title">{t('settingsTitle')}</h1>
          <p className="page-subtitle">{t('settingsSubtitle')}</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-5">{t('orgSettings')}</h2>
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
                {saving ? t('savingSettings') : t('saveSettings')}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card p-6 border border-red-200 bg-red-50/30">
        <h2 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
          🗑️ Data Reset Zone (सर्व डेटा क्लियर करा)
        </h2>
        <p className="text-xs text-red-700 mb-4">
          सर्व टेस्ट वर्गण्या (Collections), पावती डेटा (Receipts), देणगीदार (Donors) आणि खर्च (Expenses) पूर्णपणे साफ करा जेणेकरून नवीन सिस्टीम चालू करता येईल.
        </p>
        <button
          type="button"
          onClick={() => { setResetPwd(''); setShowResetModal(true); }}
          className="btn btn-danger text-xs"
        >
          🗑️ Clear All Test Data (डेटा पूर्ण क्लिअर करा)
        </button>
      </div>

      {/* Password Modal for Reset */}
      {showResetModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowResetModal(false)}>
          <div className="modal-content max-w-sm p-6">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ डेटा पूर्णपणे क्लिअर करा</h3>
            <p className="text-sm text-gray-600 mb-4">हे action अपरिवर्तनीय आहे. सुरू ठेवण्यासाठी Password टाका:</p>
            <input
              type="password"
              className="form-input w-full mb-4"
              placeholder="Password टाका..."
              value={resetPwd}
              onChange={e => setResetPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResetConfirm()}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowResetModal(false)} className="btn btn-secondary">रद्द करा</button>
              <button onClick={handleResetConfirm} disabled={resetLoading} className="btn btn-danger">
                {resetLoading ? 'क्लिअर होत आहे...' : '🗑️ क्लिअर करा'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">{t('appInfo')}</h2>
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
