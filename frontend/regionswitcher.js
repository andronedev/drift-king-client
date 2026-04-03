(function () {
  'use strict';
  if (window.__regionSwitcher) return;
  window.__regionSwitcher = true;

  const origWS = WebSocket;
  const info = { region: null, room: null, game: null, master: null };
  let forcedRegion = null;

  const REGIONS = [
    { c: 'eu',   n: 'Europe',       f: '\u{1F1EA}\u{1F1FA}' },
    { c: 'us',   n: 'US East',      f: '\u{1F1FA}\u{1F1F8}' },
    { c: 'usw',  n: 'US West',      f: '\u{1F1FA}\u{1F1F8}' },
    { c: 'ussc', n: 'US South',     f: '\u{1F1FA}\u{1F1F8}' },
    { c: 'cae',  n: 'Canada',       f: '\u{1F1E8}\u{1F1E6}' },
    { c: 'sa',   n: 'South America',f: '\u{1F1E7}\u{1F1F7}' },
    { c: 'asia', n: 'Asia',         f: '\u{1F30F}' },
    { c: 'jp',   n: 'Japan',        f: '\u{1F1EF}\u{1F1F5}' },
    { c: 'kr',   n: 'Korea',        f: '\u{1F1F0}\u{1F1F7}' },
    { c: 'hk',   n: 'Hong Kong',    f: '\u{1F1ED}\u{1F1F0}' },
    { c: 'au',   n: 'Australia',    f: '\u{1F1E6}\u{1F1FA}' },
    { c: 'in',   n: 'India',        f: '\u{1F1EE}\u{1F1F3}' },
    { c: 'ru',   n: 'Russia',       f: '\u{1F1F7}\u{1F1FA}' },
    { c: 'rue',  n: 'Russia East',  f: '\u{1F1F7}\u{1F1FA}' },
    { c: 'tr',   n: 'Turkey',       f: '\u{1F1F9}\u{1F1F7}' },
    { c: 'uae',  n: 'UAE',          f: '\u{1F1E6}\u{1F1EA}' },
    { c: 'za',   n: 'South Africa', f: '\u{1F1FF}\u{1F1E6}' },
  ];
  const RN = {}, RF = {};
  REGIONS.forEach(function (r) { RN[r.c] = r.n; RF[r.c] = r.f; });

  const SERVER_PREFIXES = {
    GCAMS: 'eu', GCASH: 'us', GCTOK: 'jp', GCSYD: 'au', GCSP: 'sa',
    GCIST: 'tr', GCDXB: 'uae', GCHK: 'hk', GCLUX: 'eu',
  };

  function readCompactStr(arr, offset) {
    var first = arr[offset], len, start;
    if (first < 128) { len = first; start = offset + 1; }
    else { len = (first & 0x7F) | (arr[offset + 1] << 7); start = offset + 2; }
    return { str: String.fromCharCode.apply(null, arr.slice(start, start + len)), end: start + len };
  }

  function findStr(arr, key) {
    for (var i = 0; i < arr.length - 3; i++) {
      if (arr[i] === key && arr[i + 1] === 0x07) {
        var r = readCompactStr(arr, i + 2);
        if (r.str && /^[\x20-\x7e]+$/.test(r.str)) return r;
      }
    }
    return null;
  }

  function replaceRegion(data, newRegion) {
    var arr = new Uint8Array(data);
    for (var i = 0; i < arr.length - 3; i++) {
      if (arr[i] === 0xD2 && arr[i + 1] === 0x07) {
        var parsed = readCompactStr(arr, i + 2);
        if (!parsed.str || parsed.str.length > 5) continue;
        var newBytes = new TextEncoder().encode(newRegion);
        var before = arr.slice(0, i + 2);
        var after = arr.slice(parsed.end);
        var result = new Uint8Array(before.length + 1 + newBytes.length + after.length);
        var off = 0;
        result.set(before, off); off += before.length;
        result[off++] = newBytes.length;
        result.set(newBytes, off); off += newBytes.length;
        result.set(after, off);
        console.log('[DK] Region: ' + parsed.str + ' \u2192 ' + newRegion);
        return result.buffer;
      }
    }
    return data;
  }

  function detectRegionFromURL(url) {
    for (var prefix in SERVER_PREFIXES) {
      if (url.toUpperCase().indexOf(prefix) !== -1) return SERVER_PREFIXES[prefix];
    }
    return null;
  }

  window.WebSocket = function (url, protocols) {
    var ws = protocols ? new origWS(url, protocols) : new origWS(url);
    var isNS = url.indexOf('photonengine.io') !== -1;

    if (url.indexOf('/Master') !== -1) {
      info.master = url.split('?')[0];
      var r = detectRegionFromURL(url); if (r) info.region = r;
    }
    if (url.indexOf('/game') !== -1) {
      info.game = url.split('?')[0];
      var r2 = detectRegionFromURL(url); if (r2) info.region = r2;
    }
    updateUI();

    var origSend = ws.send.bind(ws);
    ws.send = function (data) {
      if (data instanceof ArrayBuffer) {
        var arr = new Uint8Array(data);
        if (arr[1] === 0x02) {
          if (arr[2] === 0xE6 && isNS && forcedRegion) {
            var ri = findStr(arr, 0xD2);
            if (ri && ri.str.length <= 5) { data = replaceRegion(data, forcedRegion); info.region = forcedRegion; updateUI(); }
          }
          if (arr[2] === 0xE6) {
            var ri2 = findStr(new Uint8Array(data), 0xD2);
            if (ri2 && ri2.str.length <= 5) { info.region = ri2.str; updateUI(); }
          }
          if (arr[2] === 0xE2) {
            var ri3 = findStr(arr, 0xFF);
            if (ri3) { info.room = ri3.str; updateUI(); }
          }
        }
      }
      return origSend(data);
    };

    ws.addEventListener('message', function (evt) {
      if (!(evt.data instanceof ArrayBuffer)) return;
      var arr = new Uint8Array(evt.data);
      if (arr[1] === 0x03) {
        var ai = findStr(arr, 0xE6);
        if (ai && ai.str.indexOf('exitgames.com') !== -1) {
          if (ai.str.indexOf('/game') !== -1) info.game = ai.str;
          else if (ai.str.indexOf('/Master') !== -1) info.master = ai.str;
          var r = detectRegionFromURL(ai.str);
          if (r) info.region = r;
          updateUI();
        }
      }
    });
    return ws;
  };
  window.WebSocket.prototype = origWS.prototype;
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;

  var bar, dropdown, dropdownOpen = false;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function createUI() {
    if (bar) return;

    bar = el('div', 'dk-pill');
    document.body.appendChild(bar);

    dropdown = el('div', 'dk-dropdown');
    dropdown.appendChild(el('div', 'dk-dropdown-title', 'Select Region'));

    REGIONS.forEach(function (r) {
      var item = el('div', 'dk-dropdown-item',
        '<span class="dk-flag">' + r.f + '</span>' +
        '<span class="dk-code">' + r.c + '</span>' +
        '<span class="dk-name">' + r.n + '</span>'
      );
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        forcedRegion = forcedRegion === r.c ? null : r.c;
        closeDropdown();
        updateUI();
        showToast(forcedRegion
          ? r.f + ' ' + r.n + '\nRestart Online to apply'
          : 'Region \u2192 Auto'
        );
      });
      dropdown.appendChild(item);
    });

    var autoItem = el('div', 'dk-dropdown-auto', '\u21A9 Auto (game default)');
    autoItem.addEventListener('click', function () {
      forcedRegion = null;
      closeDropdown();
      updateUI();
      showToast('Region \u2192 Auto');
    });
    dropdown.appendChild(autoItem);

    document.body.appendChild(dropdown);

    document.addEventListener('click', function () {
      if (dropdownOpen) closeDropdown();
    });

    updateUI();
  }

  function openDropdown() {
    dropdownOpen = true;
    dropdown.style.display = 'flex';
    var items = dropdown.querySelectorAll('.dk-dropdown-item');
    items.forEach(function (item) {
      var code = item.querySelector('.dk-code').textContent.trim();
      item.classList.toggle('active', code === forcedRegion);
    });
  }

  function closeDropdown() {
    dropdownOpen = false;
    dropdown.style.display = 'none';
  }

  function showToast(msg) {
    var t = el('div', 'dk-toast', msg.replace(/\n/g, '<br>'));
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity 0.3s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 300);
    }, 2500);
  }

  function updateUI() {
    if (!bar) return;

    var r = info.region;
    var flag = r ? (RF[r] || '\u{1F310}') : '\u{1F310}';
    var name = r ? (RN[r] || r) : '\u2014';
    var room = info.room || '\u2014';
    var server = info.game
      ? info.game.replace(/^wss?:\/\//, '').replace(/\.exitgames.*/, '')
      : '\u2014';
    var fr = forcedRegion;

    var html =
      '<div class="dk-pill-item clickable" id="dk-region-btn">' +
        flag + ' <b>' + (r ? r.toUpperCase() : '\u2014') + '</b>' +
        ' <span style="opacity:0.3;font-size:10px">\u25B4</span>' +
      '</div>';

    if (fr) {
      html += '<div class="dk-pill-forced">' + RF[fr] + ' ' + fr.toUpperCase() + '</div>';
    }

    if (room !== '\u2014') {
      html +=
        '<div class="dk-pill-sep"></div>' +
        '<div class="dk-pill-item"><b>' + room + '</b></div>';
    }

    bar.innerHTML = html;

    var btn = document.getElementById('dk-region-btn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (dropdownOpen) closeDropdown();
        else openDropdown();
      });
    }
  }

  function init() {
    if (document.body) createUI();
    else document.addEventListener('DOMContentLoaded', createUI);
  }
  init();

  window.__dkInfo = info;
  window.__dkSetRegion = function (code) { forcedRegion = code || null; updateUI(); };

  console.log('[DK] Region Switcher ready');
})();
