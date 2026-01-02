const meta = document.querySelector('meta[name="scl-api-base"]');
const metaValue = meta?.getAttribute('content')?.trim();
if (metaValue) {
  window.SCL_API_BASE = metaValue;
}
