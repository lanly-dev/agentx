/**
 * AI Agent Free Tier Quota Tracker - Webview Panel
 * Displays a detailed overview of all AI provider quotas
 */

import * as vscode from 'vscode'
import { AIProvider } from './types'

export class QuotaPanel {
  public static currentPanel: QuotaPanel | undefined
  private readonly _panel: vscode.WebviewPanel
  private _disposables: vscode.Disposable[] = []

  private constructor(panel: vscode.WebviewPanel, private extensionUri: vscode.Uri) {
    this._panel = panel
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)
    this._panel.webview.html = this._getLoadingHtml()
    this._panel.webview.onDidReceiveMessage(
      message => this._handleMessage(message),
      null,
      this._disposables
    )
  }

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (QuotaPanel.currentPanel) {
      QuotaPanel.currentPanel._panel.reveal(column)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      'agentxQuotaPanel',
      'AI Quota Tracker',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: []
      }
    )

    QuotaPanel.currentPanel = new QuotaPanel(panel, extensionUri)
  }

  /**
   * Update the panel with current provider data
   */
  public update(providers: AIProvider[]): void {
    if (this._panel.visible) 
      this._panel.webview.html = this._getHtmlForProviders(providers)
    
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    QuotaPanel.currentPanel = undefined
    this._panel.dispose()
    while (this._disposables.length) {
      const d = this._disposables.pop()
      if (d) 
        d.dispose()
      
    }
  }

  private _handleMessage(message: { command: string; providerId?: string; data?: unknown }): void {
    switch (message.command) {
      case 'refresh':
        vscode.commands.executeCommand('agentx.refreshQuota')
        break
      case 'resetProvider':
        if (message.providerId) 
          vscode.commands.executeCommand('agentx.resetProvider', message.providerId)
        
        break
      case 'resetAll':
        vscode.commands.executeCommand('agentx.resetAllQuota')
        break
      case 'toggleProvider':
        if (message.providerId) 
          vscode.commands.executeCommand('agentx.toggleProvider', message.providerId)
        
        break
      case 'recordUsage':
        if (message.providerId && message.data) 
          vscode.commands.executeCommand('agentx.recordUsage', message.providerId, message.data)
        
        break
      case 'exportData':
        vscode.commands.executeCommand('agentx.exportQuota')
        break
      case 'editLimits':
        if (message.providerId) 
          vscode.commands.executeCommand('agentx.editLimits', message.providerId)
        
        break
    }
  }

  private _getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Quota Tracker</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); }
    .loading { text-align: center; padding: 40px; font-size: 16px; }
  </style>
</head>
<body>
  <div class="loading">Loading quota data...</div>
</body>
</html>`
  }

  private _getHtmlForProviders(providers: AIProvider[]): string {
    const enabledProviders = providers.filter(p => p.enabled)
    const disabledProviders = providers.filter(p => !p.enabled)

    const providerCards = enabledProviders.map(p => this._getProviderCard(p)).join('\n')
    const disabledCards = disabledProviders.map(p => this._getProviderCard(p, true)).join('\n')

    const totalAlerts = enabledProviders.filter(p => {
      const reqPct = p.limits.maxRequests > 0 ? (p.usage.requests / p.limits.maxRequests) * 100 : 0
      const inPct = p.limits.maxInputTokens > 0 ? (p.usage.inputTokens / p.limits.maxInputTokens) * 100 : 0
      const outPct = p.limits.maxOutputTokens > 0 ? (p.usage.outputTokens / p.limits.maxOutputTokens) * 100 : 0
      return Math.max(reqPct, inPct, outPct) >= 80
    }).length

    const summaryBarColor = totalAlerts > 0 ? '#e74c3c' : '#27ae60'

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Quota Tracker</title>
  <style>
    :root {
      --border-color: var(--vscode-panel-border, #ccc);
      --bg-color: var(--vscode-editor-background, #1e1e1e);
      --text-color: var(--vscode-foreground, #ccc);
      --card-bg: var(--vscode-editor-inactiveSelectionBackground, #3c3c3c);
      --accent-green: #27ae60;
      --accent-yellow: #f39c12;
      --accent-red: #e74c3c;
      --accent-blue: #3498db;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      padding: 20px;
      color: var(--text-color);
      background: var(--bg-color);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .header h1 { font-size: 24px; font-weight: 600; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn {
      padding: 6px 14px;
      border: 1px solid var(--border-color);
      background: var(--card-bg);
      color: var(--text-color);
      cursor: pointer;
      border-radius: 4px;
      font-size: 13px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.8; }
    .btn-primary { background: var(--accent-blue); color: white; border-color: var(--accent-blue); }
    .btn-danger { background: var(--accent-red); color: white; border-color: var(--accent-red); }
    .btn-success { background: var(--accent-green); color: white; border-color: var(--accent-green); }
    .btn-warning { background: var(--accent-yellow); color: white; border-color: var(--accent-yellow); }
    
    .summary-bar {
      background: ${summaryBarColor};
      color: white;
      padding: 10px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .summary-bar span { font-size: 13px; }
    
    .provider-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      transition: box-shadow 0.2s;
    }
    .provider-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .provider-card.disabled { opacity: 0.5; }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .card-title { font-size: 16px; font-weight: 600; }
    .card-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      color: white;
    }
    .badge-good { background: var(--accent-green); }
    .badge-warn { background: var(--accent-yellow); }
    .badge-danger { background: var(--accent-red); }
    .badge-disabled { background: #666; }
    
    .metric-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .metric-label {
      font-size: 13px;
      min-width: 100px;
      color: var(--text-color);
      opacity: 0.8;
    }
    .metric-value {
      font-size: 13px;
      min-width: 100px;
      text-align: right;
      font-family: monospace;
    }
    .progress-container {
      flex: 1;
      height: 8px;
      background: var(--bg-color);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .progress-green { background: var(--accent-green); }
    .progress-yellow { background: var(--accent-yellow); }
    .progress-red { background: var(--accent-red); }
    
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
    }
    .reset-info { opacity: 0.7; }
    .card-actions { display: flex; gap: 6px; }
    .btn-sm {
      padding: 3px 8px;
      font-size: 11px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-color);
      cursor: pointer;
      border-radius: 3px;
    }
    .btn-sm:hover { background: var(--card-bg); }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .tooltip { font-size: 12px; opacity: 0.6; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>$(graph) AI Quota Tracker</h1>
    <div class="header-actions">
      <button class="btn" onclick="postMessage({ command: 'refresh' })">$(sync) Refresh</button>
      <button class="btn btn-primary" onclick="postMessage({ command: 'exportData' })">$(save) Export</button>
      <button class="btn btn-danger" onclick="if(confirm('Reset ALL provider quotas?')) postMessage({ command: 'resetAll' })">$(trash) Reset All</button>
    </div>
  </div>

  <div class="summary-bar">
    <span>$(info) Tracking ${enabledProviders.length} AI providers</span>
    <span>${totalAlerts > 0 ? `$(alert) ${totalAlerts} provider(s) near quota limit` : '$(check) All quotas healthy'}</span>
  </div>

  <div class="section-title">Active Providers</div>
  ${providerCards || '<p style="opacity:0.6;padding:10px;">No active providers. Enable providers to start tracking.</p>'}

  ${disabledCards ? `<div class="section-title">Disabled Providers</div>${disabledCards}` : ''}

  <div class="tooltip">
    Quotas auto-reset based on each provider's configured interval. Use the status bar to quickly view usage.
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function postMessage(msg) { vscode.postMessage(msg); }
  </script>
</body>
</html>`
  }

  private _getProviderCard(provider: AIProvider, disabled: boolean = false): string {
    const reqPct = provider.limits.maxRequests > 0
      ? Math.min(100, (provider.usage.requests / provider.limits.maxRequests) * 100)
      : 0
    const inPct = provider.limits.maxInputTokens > 0
      ? Math.min(100, (provider.usage.inputTokens / provider.limits.maxInputTokens) * 100)
      : 0
    const outPct = provider.limits.maxOutputTokens > 0
      ? Math.min(100, (provider.usage.outputTokens / provider.limits.maxOutputTokens) * 100)
      : 0

    const maxPct = Math.max(reqPct, inPct, outPct)
    const badgeClass = maxPct >= 100 ? 'badge-danger' : maxPct >= 80 ? 'badge-warn' : 'badge-good'
    const badgeText = disabled ? 'Disabled' : maxPct >= 100 ? 'Exhausted' : maxPct >= 80 ? 'Warning' : `${Math.round(maxPct)}% used`

    const getBarClass = (pct: number) => pct >= 100 ? 'progress-red' : pct >= 80 ? 'progress-yellow' : 'progress-green'

    const timeUntilReset = this._getTimeUntilReset(provider.usage.periodReset)

    return `
  <div class="provider-card ${disabled ? 'disabled' : ''}">
    <div class="card-header">
      <div class="card-title">${provider.name}</div>
      <span class="card-badge ${disabled ? 'badge-disabled' : badgeClass}">${badgeText}</span>
    </div>

    ${provider.limits.maxRequests > 0 ? `
    <div class="metric-row">
      <span class="metric-label">Requests</span>
      <div class="progress-container">
        <div class="progress-bar ${getBarClass(reqPct)}" style="width: ${reqPct}%"></div>
      </div>
      <span class="metric-value">${provider.usage.requests} / ${provider.limits.maxRequests}</span>
    </div>` : ''}

    ${provider.limits.maxInputTokens > 0 ? `
    <div class="metric-row">
      <span class="metric-label">Input Tokens</span>
      <div class="progress-container">
        <div class="progress-bar ${getBarClass(inPct)}" style="width: ${inPct}%"></div>
      </div>
      <span class="metric-value">${this._formatNumber(provider.usage.inputTokens)} / ${this._formatNumber(provider.limits.maxInputTokens)}</span>
    </div>` : ''}

    ${provider.limits.maxOutputTokens > 0 ? `
    <div class="metric-row">
      <span class="metric-label">Output Tokens</span>
      <div class="progress-container">
        <div class="progress-bar ${getBarClass(outPct)}" style="width: ${outPct}%"></div>
      </div>
      <span class="metric-value">${this._formatNumber(provider.usage.outputTokens)} / ${this._formatNumber(provider.limits.maxOutputTokens)}</span>
    </div>` : ''}

    <div class="card-footer">
      <span class="reset-info">$(clock) ${timeUntilReset}</span>
      ${!disabled ? `
      <div class="card-actions">
        <button class="btn-sm" onclick="postMessage({ command: 'editLimits', providerId: '${provider.id}' })">$(gear) Limits</button>
        <button class="btn-sm" onclick="postMessage({ command: 'resetProvider', providerId: '${provider.id}' })">$(refresh) Reset</button>
      </div>` : `
      <div class="card-actions">
        <button class="btn-sm" onclick="postMessage({ command: 'toggleProvider', providerId: '${provider.id}' })">$(play) Enable</button>
      </div>`}
    </div>
  </div>`
  }

  private _getTimeUntilReset(periodReset: number): string {
    const now = Date.now()
    const remaining = periodReset - now
    if (remaining <= 0) return 'Resetting...'
    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `Resets in ${days}d ${hours % 24}h`
    }
    return `Resets in ${hours}h ${minutes}m`
  }

  private _formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }
}
