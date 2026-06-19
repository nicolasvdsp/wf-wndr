/** Staging / Localhost Detection
 *
 * On staging (.webflow.io) with the `dev-mode` attribute: loads the Vite dev
 * bundle from localhost. Falls back to the deployed bundle if the dev server
 * is unreachable.
 *
 * Two opt-in modes (set on the SAME <script> tag as `dev-mode`):
 *   - default                  → http://localhost:3012   (run `npm run dev`)
 *   - `https-mode` attribute   → https://localhost:3012  (run `npm run dev:https`)
 *
 * Use `https-mode` when you need to load this bundle into an https://*.webflow.io
 * page (Safari blocks `http://` script tags as mixed content). The first load of
 * `https://localhost:3012` requires accepting the self-signed certificate once
 * in the browser. With `http-mode` (default) no certificate dance is needed.
 *
 * On production (custom domain): runs the bundled code immediately.
 *
 * We do NOT probe with `fetch()` because browsers reject self-signed certs for
 * fetch with `ERR_CERT_AUTHORITY_INVALID` and never show a trust prompt — the
 * script-tag injection path matches the way Vite is normally loaded.
 *
 * Usage:
 *   <script src="main.min.js" dev-mode></script>              // HTTP localhost
 *   <script src="main.min.js" dev-mode https-mode></script>   // HTTPS localhost
 */

const DEV_PORT = 3012;
const DEV_MESSAGE = '🚧 Dev Mode activated';
const LIVE_MESSAGE = '🛸 Hi there explorer! You have stumbeled upon the mothership. Lookinging for secretes?';

export function detectAndRun(runApp) {
  if (window.__LOADER_EXECUTED) {
    runApp();
    return;
  }
  window.__LOADER_EXECUTED = true;

  const isStaging = window.location.hostname.endsWith('.webflow.io');
  const devScript = document.querySelector('script[src*="main"][dev-mode]');

  if (isStaging && devScript) {
    const useHttps = devScript.hasAttribute('https-mode');
    tryLocalDevServer(runApp, useHttps);
  } else {
    runBundled(runApp);
  }
}

function runBundled(runApp) {
  console.log(LIVE_MESSAGE);
  runApp();
}

function tryLocalDevServer(runApp, useHttps) {
  const protocol = useHttps ? 'https' : 'http';
  const devOrigin = `${protocol}://localhost:${DEV_PORT}`;
  const mainUrl = `${devOrigin}/src/main.js`;

  let settled = false;
  let outerTimer = null;
  let mainTimer = null;

  const failToBundled = (reason) => {
    clearTimeout(outerTimer);
    clearTimeout(mainTimer);
    if (settled) return;
    settled = true;
    if (reason) {
      const certHint = useHttps
        ? ` If Vite is running, open ${devOrigin} once in this browser and accept the self-signed certificate.`
        : '';
      console.warn(`[dev-mode] Using bundled JS (${reason}).${certHint}`);
    }
    runBundled(runApp);
  };

  outerTimer = setTimeout(() => {
    failToBundled('timeout waiting for @vite/client');
  }, 8000);

  const viteClient = document.createElement('script');
  viteClient.type = 'module';
  viteClient.src = `${devOrigin}/@vite/client`;
  viteClient.onerror = () => {
    const reason = useHttps
      ? 'could not load @vite/client (server off or TLS not trusted)'
      : 'could not load @vite/client (server off)';
    failToBundled(reason);
  };
  viteClient.onload = () => {
    clearTimeout(outerTimer);
    mainTimer = setTimeout(() => {
      failToBundled('timeout waiting for src/main.js');
    }, 12000);

    const devScript = document.createElement('script');
    devScript.type = 'module';
    devScript.src = mainUrl;
    devScript.onerror = () => {
      failToBundled('could not load src/main.js');
    };
    devScript.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(mainTimer);
      console.log(`${DEV_MESSAGE} (${protocol.toUpperCase()})`);
    };
    document.body.appendChild(devScript);
  };

  document.head.appendChild(viteClient);
}
