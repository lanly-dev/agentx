/**
 * AI Agent Free Tier Quota Tracker
 * Core logic for tracking and managing quota usage across AI providers
 */

import * as vscode from 'vscode'
import { AIProvider, QuotaUsage, QuotaLimit, DEFAULT_PROVIDERS } from './types'

export class QuotaTracker {
  private providers: Map<string, AIProvider> = new Map()
  private _onDidUpdateQuota = new vscode.EventEmitter<AIProvider[]>()
  readonly onDidUpdateQuota: vscode.Event<AIProvider[]> = this._onDidUpdateQuota.event

  constructor(private context: vscode.ExtensionContext) {
    this.loadProviders()
  }

  /**
   * Get all tracked providers
   */
  getProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id)
  }

  /**
   * Record usage for a specific provider
   */
  recordUsage(providerId: string, requests: number = 1, inputTokens: number = 0, outputTokens: number = 0): void {
    const provider = this.providers.get(providerId)
    if (!provider || !provider.enabled) return

    // Check if the period has reset
    this.checkAndResetPeriod(provider)

    provider.usage.requests += requests
    provider.usage.inputTokens += inputTokens
    provider.usage.outputTokens += outputTokens

    this.saveProviders()
    this._onDidUpdateQuota.fire(this.getProviders())

    // Check if approaching limits
    this.checkQuotaAlerts(provider)
  }

  /**
   * Record manual usage entry (user can add usage manually)
   */
  recordManualUsage(providerId: string, requests: number, inputTokens: number, outputTokens: number): void {
    this.recordUsage(providerId, requests, inputTokens, outputTokens)
  }

  /**
   * Reset all usage for all providers
   */
  resetAllUsage(): void {
    for (const provider of this.providers.values()) 
      this.resetProviderUsage(provider)
    
    this.saveProviders()
    this._onDidUpdateQuota.fire(this.getProviders())
  }

  /**
   * Reset usage for a specific provider
   */
  resetProvider(providerId: string): void {
    const provider = this.providers.get(providerId)
    if (!provider) return

    this.resetProviderUsage(provider)
    this.saveProviders()
    this._onDidUpdateQuota.fire(this.getProviders())
  }

  /**
   * Update provider configuration
   */
  updateProvider(id: string, updates: Partial<AIProvider>): void {
    const provider = this.providers.get(id)
    if (!provider) return

    if (updates.limits) 
      provider.limits = { ...provider.limits, ...updates.limits }
    
    if (updates.enabled !== undefined) 
      provider.enabled = updates.enabled
    
    if (updates.name) 
      provider.name = updates.name
    
    if (updates.resetIntervalHours) 
      provider.resetIntervalHours = updates.resetIntervalHours
    

    this.saveProviders()
    this._onDidUpdateQuota.fire(this.getProviders())
  }

  /**
   * Update provider limits
   */
  updateLimits(providerId: string, limits: Partial<QuotaLimit>): void {
    const provider = this.providers.get(providerId)
    if (!provider) return

    provider.limits = { ...provider.limits, ...limits }
    this.saveProviders()
    this._onDidUpdateQuota.fire(this.getProviders())
  }

  /**
   * Toggle provider enabled/disabled
   */
  toggleProvider(providerId: string): void {
    const provider = this.providers.get(providerId)
    if (!provider) return

    provider.enabled = !provider.enabled
    this.saveProviders()
    this._onDidUpdateQuota.fire(this.getProviders())
  }

  /**
   * Get usage percentage for a specific metric
   */
  getUsagePercentage(providerId: string, metric: 'requests' | 'inputTokens' | 'outputTokens'): number {
    const provider = this.providers.get(providerId)
    if (!provider || !provider.enabled) return 0

    const limitKey = metric === 'requests' ? 'maxRequests' : metric === 'inputTokens' ? 'maxInputTokens' : 'maxOutputTokens'
    const max = provider.limits[limitKey]
    if (max === 0) return 0

    return Math.min(100, (provider.usage[metric] / max) * 100)
  }

  /**
   * Check if a specific metric is approaching or exceeding limits
   */
  getQuotaAlerts(): { providerId: string; providerName: string; warnings: string[] }[] {
    const alerts: { providerId: string; providerName: string; warnings: string[] }[] = []

    for (const provider of this.providers.values()) {
      if (!provider.enabled) continue

      const warnings: string[] = []

      if (provider.limits.maxRequests > 0) {
        const reqPct = (provider.usage.requests / provider.limits.maxRequests) * 100
        if (reqPct >= 100) 
          warnings.push(`Requests exhausted (${provider.usage.requests}/${provider.limits.maxRequests})`)
         else if (reqPct >= 80) 
          warnings.push(`Requests at ${reqPct.toFixed(0)}% (${provider.usage.requests}/${provider.limits.maxRequests})`)
        
      }

      if (provider.limits.maxInputTokens > 0) {
        const inPct = (provider.usage.inputTokens / provider.limits.maxInputTokens) * 100
        if (inPct >= 100) 
          warnings.push(`Input tokens exhausted (${this.formatNumber(provider.usage.inputTokens)}/${this.formatNumber(provider.limits.maxInputTokens)})`)
         else if (inPct >= 80) 
          warnings.push(`Input tokens at ${inPct.toFixed(0)}% (${this.formatNumber(provider.usage.inputTokens)}/${this.formatNumber(provider.limits.maxInputTokens)})`)
        
      }

      if (provider.limits.maxOutputTokens > 0) {
        const outPct = (provider.usage.outputTokens / provider.limits.maxOutputTokens) * 100
        if (outPct >= 100) 
          warnings.push(`Output tokens exhausted (${this.formatNumber(provider.usage.outputTokens)}/${this.formatNumber(provider.limits.maxOutputTokens)})`)
         else if (outPct >= 80) 
          warnings.push(`Output tokens at ${outPct.toFixed(0)}% (${this.formatNumber(provider.usage.outputTokens)}/${this.formatNumber(provider.limits.maxOutputTokens)})`)
        
      }

      if (warnings.length > 0) 
        alerts.push({ providerId: provider.id, providerName: provider.name, warnings })
      
    }

    return alerts
  }

  /**
   * Format seconds until reset into a human-readable string
   */
  getTimeUntilReset(providerId: string): string {
    const provider = this.providers.get(providerId)
    if (!provider) return 'N/A'

    const now = Date.now()
    const remaining = provider.usage.periodReset - now

    if (remaining <= 0) return 'Resetting...'

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h remaining`
    }
    return `${hours}h ${minutes}m remaining`
  }

  /**
   * Export all quota data as JSON
   */
  exportData(): string {
    const data = this.getProviders().map(p => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      limits: p.limits,
      usage: p.usage,
      resetIntervalHours: p.resetIntervalHours
    }))
    return JSON.stringify(data, null, 2)
  }

  /**
   * Import quota data from JSON
   */
  importData(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (!Array.isArray(data)) return false

      for (const item of data) {
        if (item.id && item.limits && item.usage) {
          const provider = this.providers.get(item.id)
          if (provider) {
            provider.limits = item.limits
            provider.usage = item.usage
            provider.enabled = item.enabled ?? provider.enabled
          }
        }
      }

      this.saveProviders()
      this._onDidUpdateQuota.fire(this.getProviders())
      return true
    } catch {
      return false
    }
  }

  // Private Methods

  private loadProviders(): void {
    const stored = this.context.globalState.get<{ id: string; enabled: boolean; limits: QuotaLimit; usage: QuotaUsage; resetIntervalHours: number }[]>('quotaProviders')

    if (stored && stored.length > 0) {
      for (const data of stored) {
        this.providers.set(data.id, {
          id: data.id,
          name: DEFAULT_PROVIDERS.find(p => p.id === data.id)?.name || data.id,
          enabled: data.enabled,
          limits: data.limits,
          usage: data.usage,
          resetIntervalHours: data.resetIntervalHours
        })
      }

      // Add any new default providers that aren't stored yet
      for (const def of DEFAULT_PROVIDERS) {
        if (!this.providers.has(def.id)) {
          this.providers.set(def.id, {
            ...def,
            usage: this.createInitialUsage(def.resetIntervalHours)
          })
        }
      }
    } else {
      // First time: initialize with defaults
      for (const def of DEFAULT_PROVIDERS) {
        this.providers.set(def.id, {
          ...def,
          usage: this.createInitialUsage(def.resetIntervalHours)
        })
      }
    }

    this.saveProviders()
  }

  private saveProviders(): void {
    const data = Array.from(this.providers.values()).map(p => ({
      id: p.id,
      enabled: p.enabled,
      limits: p.limits,
      usage: p.usage,
      resetIntervalHours: p.resetIntervalHours
    }))
    this.context.globalState.update('quotaProviders', data)
  }

  private createInitialUsage(resetIntervalHours: number): QuotaUsage {
    const now = Date.now()
    return {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      periodStart: now,
      periodReset: now + (resetIntervalHours * 3600000)
    }
  }

  private checkAndResetPeriod(provider: AIProvider): void {
    const now = Date.now()
    if (now >= provider.usage.periodReset) 
      this.resetProviderUsage(provider)
    
  }

  private resetProviderUsage(provider: AIProvider): void {
    const now = Date.now()
    provider.usage = {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      periodStart: now,
      periodReset: now + (provider.resetIntervalHours * 3600000)
    }
  }

  private checkQuotaAlerts(provider: AIProvider): void {
    const warnings: string[] = []

    if (provider.limits.maxRequests > 0) {
      const reqPct = (provider.usage.requests / provider.limits.maxRequests) * 100
      if (reqPct >= 100) 
        warnings.push(`"${provider.name}" - Request quota exhausted!`)
       else if (reqPct >= 90) 
        warnings.push(`"${provider.name}" - 90% of request quota used`)
      
    }

    if (provider.limits.maxInputTokens > 0) {
      const inPct = (provider.usage.inputTokens / provider.limits.maxInputTokens) * 100
      if (inPct >= 100) 
        warnings.push(`"${provider.name}" - Input token quota exhausted!`)
       else if (inPct >= 90) 
        warnings.push(`"${provider.name}" - 90% of input token quota used`)
      
    }

    if (provider.limits.maxOutputTokens > 0) {
      const outPct = (provider.usage.outputTokens / provider.limits.maxOutputTokens) * 100
      if (outPct >= 100) 
        warnings.push(`"${provider.name}" - Output token quota exhausted!`)
       else if (outPct >= 90) 
        warnings.push(`"${provider.name}" - 90% of output token quota used`)
      
    }

    // Show warning for critical alerts (>= 100%)
    for (const warning of warnings) {
      if (warning.includes('exhausted')) 
        vscode.window.showWarningMessage(warning)
      
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) 
      return (num / 1000000).toFixed(1) + 'M'
    
    if (num >= 1000) 
      return (num / 1000).toFixed(1) + 'K'
    
    return num.toString()
  }
}
