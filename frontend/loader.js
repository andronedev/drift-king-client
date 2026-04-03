(function () {
  'use strict';

  const BASE_URL = 'https://www.drifted.com/wp-content/uploads/2024/12/';
  const CACHE_DB = 'driftking-cache';
  const CACHE_STORE = 'assets';
  const CACHE_VERSION = 2;

  const FILES = {
    loader: { url: 'https://www.drifted.com/media/games/generic/newLoader.js', name: 'newLoader.js', label: 'Loader' },
    data: { url: BASE_URL + 'game.data-1.unityweb', name: 'game.data.unityweb', label: 'Game Data' },
    framework: { url: BASE_URL + 'game.framework.js.unityweb', name: 'game.framework.js.unityweb', label: 'Framework' },
    wasm: { url: BASE_URL + 'game.wasm.unityweb', name: 'game.wasm.unityweb', label: 'WebAssembly' },
  };

  const statusEl = document.getElementById('status');
  const progressBar = document.getElementById('progress-bar');
  const errorEl = document.getElementById('error');
  const loadingEl = document.getElementById('loading');
  const canvas = document.getElementById('unity-canvas');

  function setStatus(text) { statusEl.textContent = text; }
  function setProgress(pct) { progressBar.style.width = Math.min(pct, 100) + '%'; }
  function showError(msg) { errorEl.textContent = msg; errorEl.style.display = 'block'; }

  function openCache() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CACHE_DB, CACHE_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getCached(db, key) {
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const req = tx.objectStore(CACHE_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function setCache(db, key, data) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      tx.objectStore(CACHE_STORE).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function downloadFile(url, label, progressOffset, progressRange) {
    setStatus('Downloading ' + label + '...');

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download ' + label + ': ' + response.status);

    const contentLength = parseInt(response.headers.get('Content-Length') || '0');
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength > 0) {
        const filePct = received / contentLength;
        setProgress(progressOffset + filePct * progressRange);
      }
    }

    const blob = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      blob.set(chunk, offset);
      offset += chunk.length;
    }
    return blob;
  }

  async function loadUnity(assets) {
    setStatus('Preparing game engine...');
    setProgress(85);

    const loaderCode = new TextDecoder().decode(assets.loader);
    const loaderScript = document.createElement('script');
    loaderScript.textContent = loaderCode;
    document.head.appendChild(loaderScript);

    if (typeof createUnityInstance !== 'function') {
      throw new Error('createUnityInstance not found in loader');
    }

    setStatus('Starting game...');
    setProgress(90);

    const dataUrl = URL.createObjectURL(new Blob([assets.data], { type: 'application/octet-stream' }));
    const frameworkUrl = URL.createObjectURL(new Blob([assets.framework], { type: 'application/javascript' }));
    const wasmUrl = URL.createObjectURL(new Blob([assets.wasm], { type: 'application/wasm' }));

    const config = {
      dataUrl: dataUrl,
      frameworkUrl: frameworkUrl,
      codeUrl: wasmUrl,
      streamingAssetsUrl: 'StreamingAssets',
      companyName: 'FreezeNova',
      productName: 'Crazy Drifter',
      productVersion: '0.1',
    };

    canvas.style.display = 'block';

    try {
      const instance = await createUnityInstance(canvas, config, (progress) => {
        setProgress(90 + progress * 10);
        if (progress < 1) {
          setStatus('Loading game... ' + Math.round(progress * 100) + '%');
        }
      });

      window.unityInstance = instance;
      loadingEl.style.display = 'none';
      console.log('[DK] Game loaded successfully!');
    } catch (err) {
      throw new Error('Unity init failed: ' + err.message);
    }
  }

  async function main() {
    try {
      const db = await openCache();
      const assets = {};

      const fileEntries = Object.entries(FILES);
      for (let i = 0; i < fileEntries.length; i++) {
        const [key, file] = fileEntries[i];
        const progressOffset = (i / fileEntries.length) * 80;
        const progressRange = 80 / fileEntries.length;

        const cached = await getCached(db, file.name);
        if (cached) {
          setStatus(file.label + ' (cached)');
          setProgress(progressOffset + progressRange);
          assets[key] = cached;
          continue;
        }

        const data = await downloadFile(file.url, file.label, progressOffset, progressRange);

        setStatus('Caching ' + file.label + '...');
        await setCache(db, file.name, data);
        assets[key] = data;
      }

      await loadUnity(assets);

    } catch (err) {
      console.error('[DK] Error:', err);
      showError('Error: ' + err.message);
    }
  }

  main();
})();
