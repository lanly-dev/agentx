/**
 * AI Agent Free Tier Quota Tracker - Sidebar Tree View Provider
 * Displays provider quotas in the VS Code activity bar sidebar
 */

import * as vscode from 'vscode'
import { AIProvider } from './types'

/**
 * Tree item representing a single provider's quota info
 */
export class QuotaTreeItem extends vscode.TreeItem {
  constructor(
    public readonly provider: AIProvider,
    public readonly parentId?: string
  ) {
    super(provider.name, vscode.TreeItemCollapsibleState.Collapsed)

    this.id = provider.id
    this.contextValue = provider.enabled ? 'provider-enabled' : 'provider-disabled'
    this.description = ''
    this.tooltip = this.buildTooltip()
    this.iconPath = this.getIcon()

    // Build the label with status badge
    const pct = this.getMaxUsagePercent()
    if (pct >= 100) {
      this.label = `$(alert) ${provider.name}`
      this.description = 'EXHAUSTED'
    } else if (pct >= 80) {
      this.label = `$(warning) ${provider.name}`
      this.description = `${Math.round(pct)}% used`
    } else if (!provider.enabled) {
      this.label = `$(circle-slash) ${provider.name}`
      this.description = 'Disabled'
    } else if (pct > 0) 
      this.description = `${Math.round(pct)}% used`
     else 
      this.description = '0% used'
    
  }

  private getMaxUsagePercent(): number {
    if (!this.provider.enabled) return 0
    const pcts: number[] = []
    if (this.provider.limits.maxRequests > 0) 
      pcts.push((this.provider.usage.requests / this.provider.limits.maxRequests) * 100)
    
    if (this.provider.limits.maxInputTokens > 0) 
      pcts.push((this.provider.usage.inputTokens / this.provider.limits.maxInputTokens) * 100)
    
    if (this.provider.limits.maxOutputTokens > 0) 
      pcts.push((this.provider.usage.outputTokens / this.provider.limits.maxOutputTokens) * 100)
    
    return pcts.length > 0 ? Math.max(...pcts) : 0
  }

  private getIcon(): vscode.ThemeIcon {
    const pct = this.getMaxUsagePercent()
    if (!this.provider.enabled) return new vscode.ThemeIcon('circle-slash')
    if (pct >= 100) return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
    if (pct >= 80) return new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'))
    return new vscode.ThemeIcon('check', new vscode.ThemeColor('gitDecoration.addedResourceForeground'))
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString()
    md.appendMarkdown(`**${this.provider.name}**\n\n`)
    md.appendMarkdown(`Status: ${this.provider.enabled ? 'Enabled' : 'Disabled'}\n\n`)
    if (this.provider.enabled) {
      if (this.provider.limits.maxRequests > 0) {
        const pct = Math.round((this.provider.usage.requests / this.provider.limits.maxRequests) * 100)
        md.appendMarkdown(`Requests: ${this.provider.usage.requests}/${this.provider.limits.maxRequests} (${pct}%)\n\n`)
      }
      if (this.provider.limits.maxInputTokens > 0) {
        const pct = Math.round((this.provider.usage.inputTokens / this.provider.limits.maxInputTokens) * 100)
        md.appendMarkdown(`Input Tokens: ${this.formatNum(this.provider.usage.inputTokens)}/${this.formatNum(this.provider.limits.maxInputTokens)} (${pct}%)\n\n`)
      }
      if (this.provider.limits.maxOutputTokens > 0) {
        const pct = Math.round((this.provider.usage.outputTokens / this.provider.limits.maxOutputTokens) * 100)
        md.appendMarkdown(`Output Tokens: ${this.formatNum(this.provider.usage.outputTokens)}/${this.formatNum(this.provider.limits.maxOutputTokens)} (${pct}%)\n\n`)
      }
      md.appendMarkdown(`Reset: ${this.formatTimeUntilReset()}\n\n`)
    }
    md.appendMarkdown('---\n*Right-click for actions*')
    return md
  }

  private formatTimeUntilReset(): string {
    const remaining = this.provider.usage.periodReset - Date.now()
    if (remaining <= 0) return 'Resetting...'
    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
    return `${hours}h ${minutes}m`
  }

  private formatNum(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }
}

/**
 * Child item for individual metrics within a provider
 */
export class QuotaMetricItem extends vscode.TreeItem {
  constructor(
    public readonly provider: AIProvider,
    public readonly metricType: 'requests' | 'inputTokens' | 'outputTokens'
  ) {
    const label = metricType === 'requests' ? 'Requests' : metricType === 'inputTokens' ? 'Input Tokens' : 'Output Tokens'
    const maxKey = metricType === 'requests' ? 'maxRequests' : metricType === 'inputTokens' ? 'maxInputTokens' : 'maxOutputTokens'
    const max = provider.limits[maxKey]
    const used = provider.usage[metricType]
    const pct = max > 0 ? Math.round((used / max) * 100) : 0

    super(label, vscode.TreeItemCollapsibleState.None)

    this.id = `${provider.id}-${metricType}`
    this.contextValue = 'metric'

    if (max === 0) 
      this.description = 'No limit set'
     else {
      this.description = `${used} / ${max}`
      this.label = `${label}: ${used}/${max}`
    }

    // Show inline progress bar using description
    if (max > 0) {
      const barLen = Math.min(20, Math.round(pct / 5))
      const bar = '█'.repeat(barLen) + '░'.repeat(Math.max(0, 20 - barLen))
      this.description = `${pct}% ${bar}`
    }

    this.tooltip = `${label}: ${used}/${max}${max > 0 ? ` (${pct}%)` : ''}`

    if (pct >= 100) 
      this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
     else if (pct >= 80) 
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'))
     else if (max > 0) 
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('gitDecoration.addedResourceForeground'))
     else 
      this.iconPath = new vscode.ThemeIcon('dash')
    
  }
}

/**
 * Tree data provider for the AI quota sidebar view
 */
export class QuotaTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null>()
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event

  private providers: AIProvider[] = []

  constructor() {}

  /**
   * Refresh the tree view with new provider data
   */
  refresh(providers: AIProvider[]): void {
    this.providers = providers
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      // Root level: show all providers
      const enabled = this.providers.filter(p => p.enabled)
      const disabled = this.providers.filter(p => !p.enabled)

      const items: vscode.TreeItem[] = []

      // Summary header
      const overallPctNum = this.getOverallUsagePercent()
      const overallPctLabel = this.getOverallUsageLabel()
      const summaryItem = new vscode.TreeItem(
        `Overall: ${overallPctLabel}`,
        vscode.TreeItemCollapsibleState.None
      )
      summaryItem.id = 'summary'
      summaryItem.contextValue = 'summary'
      summaryItem.iconPath = overallPctNum >= 80
        ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'))
        : new vscode.ThemeIcon('graph')
      summaryItem.tooltip = `${enabled.length} providers active, ${disabled.length} disabled`
      summaryItem.description = ''
      items.push(summaryItem)

      // Separator-like item
      if (enabled.length > 0) {
        const header = new vscode.TreeItem(
          '',
          vscode.TreeItemCollapsibleState.None
        )
        header.id = 'active-header'
        header.label = 'Active Providers'
        header.description = `${enabled.length}`
        header.contextValue = 'header'
        items.push(header)

        for (const p of enabled) 
          items.push(new QuotaTreeItem(p))
        
      }

      if (disabled.length > 0) {
        const header = new vscode.TreeItem(
          '',
          vscode.TreeItemCollapsibleState.None
        )
        header.id = 'disabled-header'
        header.label = 'Disabled'
        header.description = `${disabled.length}`
        header.contextValue = 'header'
        items.push(header)

        for (const p of disabled) 
          items.push(new QuotaTreeItem(p))
        
      }

      return items
    }

    // Return metric children for provider items
    if (element instanceof QuotaTreeItem) {
      const p = element.provider
      if (!p.enabled) return []

      const metrics: QuotaMetricItem[] = []
      if (p.limits.maxRequests > 0) 
        metrics.push(new QuotaMetricItem(p, 'requests'))
      
      if (p.limits.maxInputTokens > 0) 
        metrics.push(new QuotaMetricItem(p, 'inputTokens'))
      
      if (p.limits.maxOutputTokens > 0) 
        metrics.push(new QuotaMetricItem(p, 'outputTokens'))
      
      return metrics
    }

    return []
  }

  private getOverallUsagePercent(): number {
    const enabled = this.providers.filter(p => p.enabled)
    if (enabled.length === 0) return 0
    const pcts = enabled.map(p => {
      const vals: number[] = []
      if (p.limits.maxRequests > 0) vals.push((p.usage.requests / p.limits.maxRequests) * 100)
      if (p.limits.maxInputTokens > 0) vals.push((p.usage.inputTokens / p.limits.maxInputTokens) * 100)
      if (p.limits.maxOutputTokens > 0) vals.push((p.usage.outputTokens / p.limits.maxOutputTokens) * 100)
      return vals.length > 0 ? Math.max(...vals) : 0
    })
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  }

  private getOverallUsageLabel(): string {
    const enabled = this.providers.filter(p => p.enabled)
    if (enabled.length === 0) return 'No active providers'
    const pcts = enabled.map(p => {
      const vals: number[] = []
      if (p.limits.maxRequests > 0) vals.push((p.usage.requests / p.limits.maxRequests) * 100)
      if (p.limits.maxInputTokens > 0) vals.push((p.usage.inputTokens / p.limits.maxInputTokens) * 100)
      if (p.limits.maxOutputTokens > 0) vals.push((p.usage.outputTokens / p.limits.maxOutputTokens) * 100)
      return vals.length > 0 ? Math.max(...vals) : 0
    })
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    return `${avg}%`
  }
}
