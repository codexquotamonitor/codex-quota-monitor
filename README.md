# Codex Quota Monitor

> Track your Codex usage limits directly in the browser toolbar.

[![License: MIT](https://img.shields.io/badge/License-MIT-ff9800.svg)](LICENSE)

## Features

- **5-hour window** - current primary usage limit with color-coded progress bar
- **Weekly usage** - 7-day usage window when available for your plan
- **Credits remaining** - shows any extra Codex credits beyond your plan limits
- **Reset timer** - time remaining until each usage window resets
- **Toolbar badge** - usage % always visible; turns orange at 70%, red at 90%
- **Auto refresh** - updates every 10 minutes and can refresh from your authenticated ChatGPT session
- **10 languages** - English, Portuguese (BR), Spanish, French, Arabic, Bengali, Hindi, Indonesian, Russian, Chinese (Simplified)
- **Private by design** - no account, no tracking, no personal data stored

## Installation

Codex Quota Monitor is not yet published in the Chrome Web Store.

For now, install it manually:

1. Clone or download this repository
2. Open `chrome://extensions` or `brave://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder
5. Open the Codex Analytics page while logged in to ChatGPT

## How it works

The extension reads usage data from the `chatgpt.com/backend-api/wham/usage` endpoint using your existing authenticated ChatGPT session, then stores only quota metadata locally via `chrome.storage.local`.

It does **not** store your email, user ID, account ID, access token, or session token in `chrome.storage.local`, and no data leaves your browser.

**Permissions used:**
| Permission | Purpose |
|---|---|
| `storage` | Persist usage data between sessions |
| `tabs` | Open or reuse Codex pages when a manual refresh needs browser context |
| `alarms` | Schedule background refresh every 10 minutes |
| `host_permissions: chatgpt.com` | Read Codex usage data from ChatGPT |

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/codexquotamonitor/codex-quota-monitor.git
cd codex-quota-monitor
npm install
```

### Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder

### Run tests

```bash
npm test
```

The test suite currently covers popup rendering, bar colors, shared usage normalization, stale-data detection, i18n strings, and time formatting.

## Project structure

```text
codex-quota-monitor/
|-- manifest.json          # Extension manifest (MV3)
|-- background.js          # Service worker - refresh scheduler, badge updates
|-- content.js             # Injected into Codex pages - captures auth context and usage
|-- usage.js               # Shared usage normalization and freshness helpers
|-- popup.html/css/js      # Extension popup UI
|-- onboarding.html/css/js # First-install welcome page
|-- icons/                 # Extension icons (16, 48, 128px)
|-- _locales/              # i18n strings (10 languages)
`-- tests/                 # Automated test suite
```

## Contributing

Bug reports and pull requests are welcome. Please open an issue first to discuss what you would like to change.

## Privacy

This extension does not collect, store, or transmit any personal data.

## Support

- **Email:** codexquotamonitor@gmail.com

## Sponsor

Sponsor link coming soon.

## Disclaimer

This project is not affiliated with or endorsed by OpenAI.

## License

[MIT](LICENSE) (c) 2026 The Codex Quota Monitor team
