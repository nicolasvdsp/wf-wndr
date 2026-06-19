// Re-renders HubSpot forms after a Barba page transition.
//
// Webflow's HubSpot App embeds a form using the legacy v2 pattern:
//
//   <div class="hubspot-form">
//     <div class="w-embed w-script">
//       <script src="//js.hsforms.net/forms/embed/v2.js"></script>
//       <script>
//         hbspt.forms.create({ portalId: "...", formId: "...", ... });
//       </script>
//     </div>
//   </div>
//
// On a Barba transition the swapped container's <script> tags are inserted
// as inert nodes (HTML spec) and never execute on their own, so the form
// never renders. Two cases to handle:
//
//   - User came from a page that already had HubSpot loaded (e.g. they landed
//     on /book-a-demo first and then came back). `window.hbspt` is already
//     global, so we just need to re-run the inline `hbspt.forms.create(...)`
//     script.
//   - User landed on a page without a HubSpot embed first, then navigated to
//     /book-a-demo. `window.hbspt` is undefined, so we have to load the v2
//     loader ourselves before re-running the inline script.
//
// We hook into Barba's native `beforeEnter` hook (rather than the project's
// `barba:afterEnter` custom event) for two reasons:
//
//   - Earlier timing: it fires while the leave animation is still playing,
//     so the iframe is usually ready by the time the new container is visible.
//   - It does NOT fire on the initial `once` transition, so we automatically
//     skip the natural page load and avoid double-rendering the form HubSpot
//     already rendered itself — no manual "skip first" guard needed.
//
// The `barba:afterEnter` fallback DOES fire on `once` in this Barba 2.10.3
// setup, so on that path we still skip the first invocation manually.

const HUBSPOT_V2_SRC = 'https://js.hsforms.net/forms/embed/v2.js';

let hbsptReadyPromise = null;

function isHbsptReady() {
  return !!(window.hbspt && window.hbspt.forms && typeof window.hbspt.forms.create === 'function');
}

function waitForHbspt(timeoutMs = 5000) {
  if (isHbsptReady()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (isHbsptReady()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('window.hbspt was not initialized in time'));
      }
    }, 50);
  });
}

function ensureHbspt() {
  if (isHbsptReady()) return Promise.resolve();
  if (hbsptReadyPromise) return hbsptReadyPromise;

  // We deliberately do NOT check for an existing <script src=".../v2.js">
  // in the document: any such tag inside Barba's swapped container is inert
  // (the browser does not execute scripts inserted via innerHTML), so
  // querying for it would make us wait for an `hbspt` global that is never
  // going to appear. Instead we always inject our own <script> into <head>
  // the first time we need it, and the cached promise prevents duplicates.
  hbsptReadyPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HUBSPOT_V2_SRC;
    script.charset = 'utf-8';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => waitForHbspt().then(resolve, reject);
    script.onerror = () => {
      hbsptReadyPromise = null;
      reject(new Error('Failed to load HubSpot v2 embed'));
    };
    document.head.appendChild(script);
  });

  return hbsptReadyPromise;
}

function getInlineHubspotScripts(container) {
  return Array.from(container.querySelectorAll('script')).filter((script) => {
    if (script.src) return false;
    const content = script.textContent || '';
    return content.includes('hbspt.forms.create') || content.includes('hbspt.cta.load');
  });
}

function reExecuteScript(oldScript) {
  const newScript = document.createElement('script');
  Array.from(oldScript.attributes).forEach((attr) => {
    newScript.setAttribute(attr.name, attr.value);
  });
  newScript.textContent = oldScript.textContent;
  oldScript.parentNode.replaceChild(newScript, oldScript);
}

function initHubspotForms(container) {
  container = container || document;

  const inlineScripts = getInlineHubspotScripts(container);
  if (!inlineScripts.length) return;

  ensureHbspt()
    .then(() => inlineScripts.forEach(reExecuteScript))
    .catch((err) => console.warn('[hubspot]', err));
}

function hubspot() {
  if (typeof window.barba !== 'undefined' && window.barba.hooks && typeof window.barba.hooks.beforeEnter === 'function') {
    window.barba.hooks.beforeEnter((data) => initHubspotForms(data.next.container));
    return;
  }

  let firstInvocationSkipped = false;
  document.addEventListener('barba:afterEnter', (e) => {
    if (!firstInvocationSkipped) {
      firstInvocationSkipped = true;
      return;
    }
    initHubspotForms(e.detail.container);
  });
}

export default hubspot;
