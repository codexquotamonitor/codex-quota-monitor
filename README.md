# Codex Usage Monitor

Prototype Chrome/Brave extension for monitoring Codex usage limits from the browser toolbar.

## What It Does

- Reads Codex usage from `https://chatgpt.com/backend-api/wham/usage`
- Shows the current primary usage window, used percent, remaining percent, and reset timer
- Updates the toolbar badge every 10 minutes and when Codex pages are open
- Stores only usage metadata locally via `chrome.storage.local`
- Does not store email, user ID, account ID, access tokens, or session tokens

## Development Install

1. Open `brave://extensions`
2. Enable developer mode
3. Click **Load unpacked**
4. Select `C:\Claude\codex-usage-monitor`
5. Open `https://chatgpt.com/codex/cloud/settings/analytics` while logged in
6. Click the extension icon

## Tests

```bash
npm test
```

## Notes

This is an experimental fork of Claude Quota Monitor. It is not affiliated with OpenAI.
