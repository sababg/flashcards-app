// LocalStorage helpers with versioning and safe parse fallback
(function () {
  const STORAGE_KEY_PREFIX = "flashcards_";

  function loadState(key, expectedVersion) {
    try {
      const fullKey = STORAGE_KEY_PREFIX + key;
      const raw = localStorage.getItem(fullKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      // Check version
      if (parsed.version !== expectedVersion) {
        console.warn(
          `Storage version mismatch for ${key}: expected ${expectedVersion}, got ${parsed.version}`,
        );
        return null;
      }

      return parsed.data;
    } catch (err) {
      console.error("loadState error:", err);
      return null;
    }
  }

  function saveState(key, data, version) {
    try {
      const fullKey = STORAGE_KEY_PREFIX + key;
      const payload = {
        version: version,
        data: data,
        timestamp: Date.now(),
      };
      localStorage.setItem(fullKey, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error("saveState error:", err);
      return false;
    }
  }

  function clearState(key) {
    try {
      const fullKey = STORAGE_KEY_PREFIX + key;
      localStorage.removeItem(fullKey);
      return true;
    } catch (err) {
      console.error("clearState error:", err);
      return false;
    }
  }

  // Expose globally
  window.storage = {
    loadState,
    saveState,
    clearState,
  };
})();
