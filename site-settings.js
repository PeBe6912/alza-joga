(function () {
  const defaults = {
    cancellation_hours: 24,
    minimum_attendance: 5,
    default_paid_price: 150,
    studio_capacity: 20,
  };

  async function loadPublicSettings() {
    try {
      const query = new URLSearchParams({ select: 'key,value', is_public: 'eq.true' });
      const response = await fetch(`${window.JOGA_CONFIG.supabaseUrl}/rest/v1/site_settings?${query}`, {
        headers: { apikey: window.JOGA_CONFIG.publishableKey },
      });
      if (!response.ok) throw new Error('SETTINGS_NOT_AVAILABLE');
      const rows = await response.json();
      return rows.reduce((settings, row) => ({ ...settings, [row.key]: row.value }), { ...defaults });
    } catch (error) {
      console.error(error);
      return { ...defaults };
    }
  }

  function applyPublicSettings(settings) {
    document.querySelectorAll('[data-setting]').forEach((element) => {
      const value = settings[element.dataset.setting];
      if (value !== undefined && value !== null) element.textContent = String(value);
    });
  }

  window.JOGA_CONFIG = {
    supabaseUrl: 'https://zltcizbzckyazlxilzwq.supabase.co',
    publishableKey: 'sb_publishable_X1KLjQkjhSe3Sl-McSQNBA_hz9d5HKR',
    defaults,
    loadPublicSettings,
    applyPublicSettings,
  };
})();
