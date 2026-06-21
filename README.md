# AI Agent Free Tier Quota Tracker

Track and monitor your free tier quota usage across AI providers including OpenAI, Anthropic Claude, Google Gemini, GitHub Copilot, and more.

## Features

### 🔍 Real-time Quota Dashboard in Activity Bar
View all your AI provider quotas directly in the VS Code sidebar with color-coded status indicators.

![Sidebar View](https://img.shields.io/badge/sidebar-tree_view-blue)

- **Overall usage summary** at the top
- **Expandable provider cards** showing requests, input tokens, output tokens
- **Progress bars** using Unicode characters
- **Color-coded icons**: green (healthy), yellow (warning ≥80%), red (exhausted)
- **Auto-refresh** whenever usage is recorded

### 🔌 Automatic Tracking via Network Interception
The extension automatically detects HTTP/HTTPS requests to known AI API endpoints made from within VS Code and records quota usage in real-time.

**Supported endpoints:**
- api.openai.com → OpenAI GPT-4o mini
- api.anthropic.com → Anthropic Claude
- generativelanguage.googleapis.com → Google Gemini
- api.githubcopilot.com / copilot-proxy.githubusercontent.com → GitHub Copilot
- api.groq.com, api.together.xyz, api.mistral.ai, api.deepinfra.com, api.replicate.com, api.cohere.ai, api.perplexity.ai, api.elevenlabs.io, api.stability.ai, aiplatform.googleapis.com, bedrock-runtime.*
- *.openai.azure.com → Azure OpenAI

Token counts are estimated from request/response body sizes (~4.5 bytes = 1 token).

Toggle auto-tracking on/off via the sidebar title bar button or command palette.

### 📝 Manual Tracking
If auto-tracking doesn't cover your use case, you can manually record usage:

- **Right-click** any provider in the sidebar → **Record +1 Request**
- **Command Palette** → `agentx: Record Usage` → interactive wizard
- **Quick Record** via command palette

### ⚠️ Quota Alerts
Get warned when you're approaching your limits:
- **80%** usage → yellow warning in sidebar
- **100%** usage → red exhausted state
- **Status bar** shows the most critical provider's usage
- **Command** `agentx: Show Alerts` lists all active warnings

## Commands

| Command | Description |
|---------|-------------|
| `agentx: Show Quota Sidebar` | Open the AI Quota sidebar in activity bar |
| `agentx: Record Usage` | Interactively record API usage |
| `agentx: Edit Provider Limits` | Change max requests/tokens for a provider |
| `agentx: List & Toggle Providers` | View all providers and toggle enabled/disabled |
| `agentx: Show Alerts` | Display current quota warnings |
| `agentx: Reset Provider Quota` | Clear usage for one provider |
| `agentx: Reset All Quotas` | Clear usage for all providers |
| `agentx: Toggle Auto-Tracking` | Start/stop network interception |
| `agentx: Export Quota Data` | Export all quota data as JSON |
| `agentx: Import Quota Data` | Import quota data from JSON file |
| `agentx: Refresh View` | Manually refresh the sidebar |

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `agentx.quotaTracker.enabled` | `true` | Enable or disable the quota tracker |
| `agentx.quotaTracker.autoTrack` | `true` | Automatically detect and track AI API calls by intercepting HTTP requests |
| `agentx.quotaTracker.showStatusBar` | `true` | Show quota usage in the status bar |
| `agentx.quotaTracker.showAlerts` | `true` | Show warning notifications when approaching quota limits |
| `agentx.quotaTracker.alertThreshold` | `80` | Percentage threshold at which to start showing quota warnings |

## Sidebar Context Menu

Right-click a provider in the sidebar for quick actions:

| Action | Description |
|--------|-------------|
| **Record +1 Request** | Immediately add one request to that provider |
| **Toggle Provider** | Enable/disable tracking for that provider |
| **Reset Provider Quota** | Clear all usage for that provider |
| **Edit Limits...** | Change max requests/tokens |

## Sidebar Title Bar

| Button | Description |
|--------|-------------|
| 🔄 Refresh | Refresh all quota data |
| 🗑 Reset All | Reset all provider quotas |
| 📡 Toggle Auto-Tracking | Start/stop network interception |

## Getting Started

1. Install the extension
2. The AI Quota Tracker icon will appear in your activity bar (left sidebar)
3. Click the icon to open the quota sidebar — it will be empty initially
4. Or simply use the AI services — auto-tracking will detect API calls and create entries
6. Monitor your usage in real-time from the sidebar

## Requirements

- VS Code ^1.125.0
- No external dependencies required

## Known Issues

- Auto-tracking only works for HTTP requests made **within the VS Code extension host process**. External API calls from your browser or standalone tools are not automatically detected — use manual recording for those.
- Token estimation is approximate (±20%) based on byte-length conversion.

## Release Notes

### 0.1.0

Initial release:
- Sidebar tree view with color-coded provider cards
- Network interceptor for automatic API call detection
- Manual usage recording
- Quota alerts at configurable thresholds
- Data export/import as JSON
- Configured limits per provider
- Automatic period reset based on configurable intervals

---

**Enjoy tracking your AI usage!**