/**
 * AI Agent Free Tier Quota Tracker - Status Bar Manager
 * Manages status bar items for displaying quota usage
 */

import * as vscode from 'vscode'
import { AIProvider } from './types'

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
    this.statusBarItem.command = 'agentx.showQuotaPanel'
    this.statusBarItem.tooltip = 'Click to open AI Quota Tracker panel'
    this.statusBarItem.text = '$(graph) AI Quota'
    this.statusBarItem.show()
  }

  /**
   * Update the status bar with current provider usage
   */
  update(providers: AIProvider[]): void {
    const enabledProviders = providers.filter(p => p.enabled)
    if (enabledProviders.length === 0) {
      this.statusBarItem.text = '$(graph) AI Quota'
      this.statusBarItem.tooltip = 'No AI providers configured. Click to configure.'
      return
    }

    // Find the most critical provider (highest usage percentage)
    let maxUsagePct = 0
    let mostCriticalProvider: AIProvider | null = null

    for (const provider of enabledProviders) {
      const reqPct = provider.limits.maxRequests > 0
        ? (provider.usage.requests / provider.limits.maxRequests) * 100
        : 0
      const inPct = provider.limits.maxInputTokens > 0
        ? (provider.usage.inputTokens / provider.limits.maxInputTokens) * 100
        : 0
      const outPct = provider.limits.maxOutputTokens > 0
        ? (provider.usage.outputTokens / provider.limits.maxOutputTokens) * 100
        : 0

      const maxPct = Math.max(reqPct, inPct, outPct)
      if (maxPct > maxUsagePct) {
        maxUsagePct = maxPct
        mostCriticalProvider = provider
      }
    }

    // Build the status bar text
    if (mostCriticalProvider) {
      const icon = maxUsagePct >= 100 ? '$(alert)' : maxUsagePct >= 80 ? '$(warning)' : '$(graph)'
      const pct = Math.round(maxUsagePct)
      this.statusBarItem.text = `${icon} ${mostCriticalProvider.name}: ${pct}%`
    }

    // Build the tooltip with detailed info
    const lines: string[] = ['**AI Quota Tracker**', '---']
    for (const provider of enabledProviders) {
      const reqPct = provider.limits.maxRequests > 0
        ? `${Math.round((provider.usage.requests / provider.limits.maxRequests) * 100)}%`
        : 'N/A'
      const inTokens = provider.limits.maxInputTokens > 0
        ? `${this.formatNumber(provider.usage.inputTokens)}/${this.formatNumber(provider.limits.maxInputTokens)}`
        : 'N/A'
      const outTokens = provider.limits.maxOutputTokens > 0
        ? `${this.formatNumber(provider.usage.outputTokens)}/${this.formatNumber(provider.limits.maxOutputTokens)}`
        : 'N/A'

      lines.push(`**${provider.name}**`)
      lines.push(`  Requests: ${provider.usage.requests}/${provider.limits.maxRequests} (${reqPct})`)
      if (provider.limits.maxInputTokens > 0) 
        lines.push(`  Input: ${inTokens}`)
      
      if (provider.limits.maxOutputTokens > 0) 
        lines.push(`  Output: ${outTokens}`)
      
      lines.push('')
    }
    lines.push('Click to open detailed view')

    this.statusBarItem.tooltip = lines.join('\n')
  }

  /**
   * Dispose all status bar items
   */
  dispose(): void {
    this.statusBarItem.dispose()
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) 
      return (num / 1000000).toFixed(1) + 'M'
    
    if (num >= 1000) 
      return (num / 1000).toFixed(1) + 'K'
    
    return num.toString()
  }
}
