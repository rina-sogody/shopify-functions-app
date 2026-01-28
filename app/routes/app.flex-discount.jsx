import { useEffect, useState } from "react";

export default function TieredDiscountDashboardPage() {
  const [extension, setExtension] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    async function loadExtension() {
      try {
        const mod = await import("../../extensions/flex-discount/src/cart_lines_discounts_generate_run.js");
        console.log("Loaded module:", mod);
        setExtension(mod.metadata);

        const initialSettings = {};
        mod.metadata.settings.forEach(s => {
          initialSettings[s.key] = s.default;
        });
        setSettings(initialSettings);
      } catch (err) {
        console.error("Failed to load extension:", err);
      }
    }

    loadExtension();
  }, []);

  if (!extension) return <p>Loading...</p>;

  function handleSettingChange(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  return (
    <s-page heading="Dashboard">
      <s-section heading={extension?.name}>
        <s-paragraph>{extension?.description}</s-paragraph>

        <s-section heading="Settings">
          {extension?.settings.map(setting => (
            <div key={setting.key} style={{ marginBottom: "1rem" }}>
              <label>
                {setting.label}:
                {setting.type === "json" ? (
                  <textarea
                    style={{ width: "100%", height: "6rem" }}
                    value={settings[setting.key]}
                    onChange={e => handleSettingChange(setting.key, e.target.value)}
                  />
                ) : (
                  <input
                    type={setting.type}
                    value={settings[setting.key]}
                    onChange={e =>
                      handleSettingChange(
                        setting.key,
                        setting.type === "number"
                          ? parseInt(e.target.value, 10)
                          : e.target.value
                      )
                    }
                  />
                )}
              </label>
            </div>
          ))}
        </s-section>

        <s-button
          onClick={() => {
            let parsedSettings = { ...settings };

            // Try parsing JSON fields
            extension?.settings.forEach(s => {
              if (s.type === "json") {
                try {
                  parsedSettings[s.key] = JSON.parse(parsedSettings[s.key]);
                } catch (err) {
                  alert(`Invalid JSON in ${s.label}`);
                  return;
                }
              }
            });

            console.log("Saved settings:", parsedSettings);
            alert("Settings saved! Check console for details.");
          }}
        >
          Save Settings
        </s-button>
      </s-section>
    </s-page>
  );
}
