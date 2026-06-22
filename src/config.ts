/**
 * AI Agent Free Tier Quota Tracker - Configuration Manager
 * Handles reading/writing VS Code settings for the extension
 */

import * as vscode from 'vscode'
import { QuotaLimit, AIProvider } from './types'

const CONFIG_SECTION = 'agentx.quotaTracker'

export interface ExtensionConfig {
  enabled: boolean;
  autoTrack: boolean;
  showStatusBar: boolean;
  showAlerts: boolean;
  alertThreshold: number;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  enabled: true,
  autoTrack: true,
  showStatusBar: true,
  showAlerts: true,
  alertThreshold: 80
}

export class ConfigManager {
  private config: ExtensionConfig

  constructor() {
    this.config = this._loadConfig()
  }

  /**
   * Get the current configuration
   */
  get(): ExtensionConfig {
    return { ...this.config }
  }

  /**
   * Update a specific config value
   */
  update<K extends keyof ExtensionConfig>(key: K, value: ExtensionConfig[K]): void {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_SECTION)
    vsConfig.update(key, value, vscode.ConfigurationTarget.Global)
    this.config[key] = value
  }

  /**
   * Reset all config to defaults
   */
  reset(): void {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_SECTION)
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) 
      vsConfig.update(key, value, vscode.ConfigurationTarget.Global)
    
    this.config = { ...DEFAULT_CONFIG }
  }

  // Private methods

  private _loadConfig(): ExtensionConfig {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_SECTION)
    return {
      enabled: vsConfig.get<boolean>('enabled', DEFAULT_CONFIG.enabled),
      autoTrack: vsConfig.get<boolean>('autoTrack', DEFAULT_CONFIG.autoTrack),
      showStatusBar: vsConfig.get<boolean>('showStatusBar', DEFAULT_CONFIG.showStatusBar),
      showAlerts: vsConfig.get<boolean>('showAlerts', DEFAULT_CONFIG.showAlerts),
      alertThreshold: vsConfig.get<number>('alertThreshold', DEFAULT_CONFIG.alertThreshold)
    }
  }
}
