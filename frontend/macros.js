(function () {
  'use strict';

  var macroActive = false;
  var macroInterval = null;

  function startMacro() {
    if (macroActive) return;
    macroActive = true;
    var canvas = document.getElementById('unity-canvas');
    if (!canvas) return;

    canvas.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 71, key: 'g', code: 'KeyG', bubbles: true }));

    macroInterval = setInterval(function () {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 82, key: 'r', code: 'KeyR', bubbles: true }));
      setTimeout(function () {
        canvas.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 82, key: 'r', code: 'KeyR', bubbles: true }));
      }, 40);
    }, 80);
  }

  function stopMacro() {
    if (!macroActive) return;
    macroActive = false;
    clearInterval(macroInterval);
    var canvas = document.getElementById('unity-canvas');
    if (!canvas) return;

    canvas.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 71, key: 'g', code: 'KeyG', bubbles: true }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 82, key: 'r', code: 'KeyR', bubbles: true }));
  }

  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyF' && !e.repeat) startMacro();
  }, true);

  document.addEventListener('keyup', function (e) {
    if (e.code === 'KeyF') stopMacro();
  }, true);
})();
