(function () {
  'use strict';

  var WRAP_IMAGE_KEY = 'dk.customWrapImage';
  var WRAP_OPACITY_KEY = 'dk.customWrapOpacity';
  var DEFAULT_OPACITY = 0.2;
  var MIN_OPACITY = 0.05;
  var MAX_OPACITY = 1;
  var MAX_WRAP_FILE_BYTES = 1024 * 1024;
  var MAX_WRAP_DATA_URL_LENGTH = 2 * 1024 * 1024;
  var panelOpen = false;
  var overlay;
  var overlayImage;
  var panel;
  var saveOpacityTimer = null;
  var ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];

  function isOnlineRoomActive() {
    if (!window.__dkInfo) return false;
    var room = window.__dkInfo.room;
    return typeof room === 'string' && room.trim() !== '';
  }

  function isSafeWrapImage(value) {
    if (typeof value !== 'string') return false;
    var match = value.match(/^data:(image\/[^;]+);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) return false;
    if (value.length > MAX_WRAP_DATA_URL_LENGTH) return false;
    return ALLOWED_MIME_TYPES.indexOf(match[1].toLowerCase()) !== -1;
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'dk-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity 0.3s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 300);
    }, 2200);
  }

  function setWrap(imageUrl, opacity) {
    if (!imageUrl || !isSafeWrapImage(imageUrl) || isOnlineRoomActive()) {
      overlay.style.display = 'none';
      return;
    }
    overlayImage.src = imageUrl;
    overlay.style.opacity = String(opacity);
    overlay.style.display = 'block';
  }

  function saveWrap(imageUrl, opacity) {
    if (imageUrl) localStorage.setItem(WRAP_IMAGE_KEY, imageUrl);
    else localStorage.removeItem(WRAP_IMAGE_KEY);
    localStorage.setItem(WRAP_OPACITY_KEY, String(opacity));
  }

  function loadOpacity() {
    var raw = localStorage.getItem(WRAP_OPACITY_KEY);
    var value = Number(raw);
    return Number.isFinite(value) && value >= MIN_OPACITY && value <= MAX_OPACITY
      ? value
      : DEFAULT_OPACITY;
  }

  function applySavedWrap() {
    var image = localStorage.getItem(WRAP_IMAGE_KEY);
    if (!image || !isSafeWrapImage(image)) {
      overlay.style.display = 'none';
      return;
    }
    setWrap(image, loadOpacity());
  }

  function buildUI() {
    overlay = document.createElement('div');
    overlay.className = 'dk-wrap-overlay';
    overlayImage = document.createElement('img');
    overlayImage.alt = '';
    overlay.appendChild(overlayImage);
    document.body.appendChild(overlay);

    panel = document.createElement('div');
    panel.className = 'dk-wrap-panel';
    panel.innerHTML =
      '<div class="dk-wrap-title">Custom Wrap (Single-player)</div>' +
      '<button class="dk-wrap-btn" id="dk-wrap-upload">Upload image</button>' +
      '<input class="dk-wrap-slider" id="dk-wrap-opacity" type="range" min="' + MIN_OPACITY + '" max="' + MAX_OPACITY + '" step="0.05">' +
      '<div class="dk-wrap-actions">' +
        '<button class="dk-wrap-btn" id="dk-wrap-clear">Disable</button>' +
      '</div>' +
      '<div class="dk-wrap-note">Local visual effect only. Disabled while in online rooms.</div>';
    document.body.appendChild(panel);

    var toggle = document.createElement('button');
    toggle.className = 'dk-wrap-toggle';
    toggle.textContent = '\uD83C\uDFA8 Wrap';
    document.body.appendChild(toggle);

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    var opacityInput = panel.querySelector('#dk-wrap-opacity');
    var savedOpacity = loadOpacity();
    opacityInput.value = String(savedOpacity);

    var savedImage = localStorage.getItem(WRAP_IMAGE_KEY);
    if (savedImage && isSafeWrapImage(savedImage)) setWrap(savedImage, savedOpacity);
    else localStorage.removeItem(WRAP_IMAGE_KEY);

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      panelOpen = !panelOpen;
      panel.style.display = panelOpen ? 'block' : 'none';
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    document.addEventListener('click', function () {
      panelOpen = false;
      panel.style.display = 'none';
    });

    panel.querySelector('#dk-wrap-upload').addEventListener('click', function () {
      if (isOnlineRoomActive()) {
        showToast('Custom wraps are available only in single-player mode.');
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (isOnlineRoomActive()) {
        showToast('Leave the online room before applying a custom wrap.');
        return;
      }
      if (file.size > MAX_WRAP_FILE_BYTES) {
        showToast('Image is too large. Please use a file under 1MB.');
        fileInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var image = typeof reader.result === 'string' ? reader.result : '';
        if (!isSafeWrapImage(image)) {
          showToast('Please choose a valid image file.');
          return;
        }
        var opacity = Number(opacityInput.value);
        setWrap(image, opacity);
        saveWrap(image, opacity);
        showToast('Custom wrap applied.');
      };
      reader.onerror = function () {
        showToast('Failed to read image file.');
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });

    opacityInput.addEventListener('input', function () {
      var image = localStorage.getItem(WRAP_IMAGE_KEY);
      var opacity = Number(opacityInput.value);
      if (image) setWrap(image, opacity);
      if (saveOpacityTimer) clearTimeout(saveOpacityTimer);
      saveOpacityTimer = setTimeout(function () {
        saveWrap(image, opacity);
      }, 250);
    });

    panel.querySelector('#dk-wrap-clear').addEventListener('click', function () {
      overlay.style.display = 'none';
      localStorage.removeItem(WRAP_IMAGE_KEY);
      showToast('Custom wrap disabled.');
    });

    if (window.__dkInfo) {
      var info = window.__dkInfo;
      var roomValue = info.room;
      try {
        Object.defineProperty(info, 'room', {
          configurable: true,
          enumerable: true,
          get: function () { return roomValue; },
          set: function (value) {
            roomValue = value;
            if (isOnlineRoomActive()) overlay.style.display = 'none';
            else applySavedWrap();
          }
        });
      } catch (e) {
        console.warn('[DK] Unable to watch room changes for custom wraps:', e);
      }
    }
  }

  if (document.body) buildUI();
  else document.addEventListener('DOMContentLoaded', buildUI);
})();
