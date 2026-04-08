(function () {
  'use strict';

  var WRAP_IMAGE_KEY = 'dk.customWrapImage';
  var WRAP_OPACITY_KEY = 'dk.customWrapOpacity';
  var panelOpen = false;
  var overlay;
  var panel;

  function isOnlineRoomActive() {
    return !!(window.__dkInfo && window.__dkInfo.room && window.__dkInfo.room !== '\u2014');
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
    if (!imageUrl) {
      overlay.style.display = 'none';
      return;
    }
    overlay.style.backgroundImage = 'url("' + imageUrl.replace(/"/g, '%22') + '")';
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
    return Number.isFinite(value) && value >= 0.05 && value <= 1 ? value : 0.2;
  }

  function buildUI() {
    overlay = document.createElement('div');
    overlay.className = 'dk-wrap-overlay';
    document.body.appendChild(overlay);

    panel = document.createElement('div');
    panel.className = 'dk-wrap-panel';
    panel.innerHTML =
      '<div class="dk-wrap-title">Custom Wrap (Single-player)</div>' +
      '<button class="dk-wrap-btn" id="dk-wrap-upload">Upload image</button>' +
      '<input class="dk-wrap-slider" id="dk-wrap-opacity" type="range" min="0.05" max="1" step="0.05">' +
      '<div class="dk-wrap-actions">' +
        '<button class="dk-wrap-btn" id="dk-wrap-clear">Disable</button>' +
      '</div>' +
      '<div class="dk-wrap-note">Local visual effect only. Disabled while in online rooms.</div>';
    document.body.appendChild(panel);

    var toggle = document.createElement('button');
    toggle.className = 'dk-wrap-toggle';
    toggle.textContent = '\u{1F3A8} Wrap';
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
    if (savedImage) setWrap(savedImage, savedOpacity);

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
      var reader = new FileReader();
      reader.onload = function () {
        var image = typeof reader.result === 'string' ? reader.result : '';
        if (!image) return;
        var opacity = Number(opacityInput.value);
        setWrap(image, opacity);
        saveWrap(image, opacity);
        showToast('Custom wrap applied.');
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });

    opacityInput.addEventListener('input', function () {
      var image = localStorage.getItem(WRAP_IMAGE_KEY);
      var opacity = Number(opacityInput.value);
      if (image) setWrap(image, opacity);
      saveWrap(image, opacity);
    });

    panel.querySelector('#dk-wrap-clear').addEventListener('click', function () {
      overlay.style.display = 'none';
      localStorage.removeItem(WRAP_IMAGE_KEY);
      showToast('Custom wrap disabled.');
    });

    setInterval(function () {
      if (isOnlineRoomActive() && overlay.style.display !== 'none') {
        overlay.style.display = 'none';
      }
    }, 1000);
  }

  if (document.body) buildUI();
  else document.addEventListener('DOMContentLoaded', buildUI);
})();
