/**
 * AI Agent Free Tier Quota Tracker - Configuration Manager
 * Handles reading/writing VS Code settings for the extension
 */

import * as vscode from 'vscode';
import { QuotaLimit, AIProvider, DEFAULT_PROVIDERS } from './types';

const CONFIG_SECTION = 'agentx.quotaTracker';

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
  alertThreshold: 80,
};

export class ConfigManager {
  private config: ExtensionConfig;

  constructor() {
    this.config = this._loadConfig();
  }

  /**
   * Get the current configuration
   */
  get(): ExtensionConfig {
    return { ...this.config };
  }

  /**
   * Update a specific config value
   */
  update<K extends keyof ExtensionConfig>(key: K, value: ExtensionConfig[K]): void {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    vsConfig.update(key, value, vscode.ConfigurationTarget.Global);
    this.config[key] = value;
  }

  /**
   * Reset all config to defaults
   */
  reset(): void {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      vsConfig.update(key, value, vscode.ConfigurationTarget.Global);
    }
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Show a quick pick to record usage for a provider
   */
  static async promptRecordUsage(tracker: { getProviders: () => AIProvider[]; recordUsage: (id: string, req: number, inT: number, outT: number) => void }): Promise<void> {
    const providers = tracker.getProviders().filter(p => p.enabled);
    if (providers.length === 0) {
      vscode.window.showInformationMessage('No AI providers enabled. Enable one first.');
      return;
    }

    const provider = await vscode.window.showQuickPick(
      providers.map(p => ({ label: p.name, description: p.id })),
      { placeHolder: 'Select AI provider to record usage for' }
    );
    if (!provider) {return;}

    const requests = await vscode.window.showInputBox({
      prompt: 'Number of requests made',
      value: '1',
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!requests) {return;}

    const inputTokens = await vscode.window.showInputBox({
      prompt: 'Input tokens used (optional)',
      value: '0',
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!inputTokens) {return;}

    const outputTokens = await vscode.window.showInputBox({
      prompt: 'Output tokens used (optional)',
      value: '0',
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!outputTokens) {return;}

    tracker.recordUsage(provider.description, Number(requests), Number(inputTokens), Number(outputTokens));
    vscode.window.showInformationMessage(`Recorded usage for ${provider.label}: ${requests} request(s), ${inputTokens} input, ${outputTokens} output tokens`);
  }

  /**
   * Show a quick pick to edit limits for a provider
   */
  static async promptEditLimits(tracker: { getProviders: () => AIProvider[]; updateLimits: (id: string, limits: Partial<QuotaLimit>) => void }): Promise<void> {
    const providers = tracker.getProviders();
    const provider = await vscode.window.showQuickPick(
      providers.map(p => ({ label: p.name, description: p.id })),
      { placeHolder: 'Select AI provider to edit limits' }
    );
    if (!provider) {return;}

    const p = providers.find(x => x.id === provider.description);
    if (!p) {return;}

    const maxRequests = await vscode.window.showInputBox({
      prompt: 'Max requests',
      value: String(p.limits.maxRequests),
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!maxRequests) {return;}

    const maxInput = await vscode.window.showInputBox({
      prompt: 'Max input tokens',
      value: String(p.limits.maxInputTokens),
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!maxInput) {return;}

    const maxOutput = await vscode.window.showInputBox({
      prompt: 'Max output tokens',
      value: String(p.limits.maxOutputTokens),
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!maxOutput) {return;}

    tracker.updateLimits(provider.description, {
      maxRequests: Number(maxRequests),
      maxInputTokens: Number(maxInput),
      maxOutputTokens: Number(maxOutput),
    });

    vscode.window.showInformationMessage(`Updated limits for ${provider.label}`);
  }

  /**
   * Prompt to add a custom provider
   */
  static async promptAddCustomProvider(tracker: { updateProvider: (id: string, updates: Partial<AIProvider>) => void }): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Provider name (e.g. "My Custom API")',
      placeHolder: 'Enter provider name',
    });
    if (!name) {return;}

    const maxRequests = await vscode.window.showInputBox({
      prompt: 'Max requests per period',
      value: '100',
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!maxRequests) {return;}

    const maxInput = await vscode.window.showInputBox({
      prompt: 'Max input tokens',
      value: '100000',
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!maxInput) {return;}

    const maxOutput = await vscode.window.showInputBox({
      prompt: 'Max output tokens',
      value: '50000',
      validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null,
    });
    if (!maxOutput) {return;}

    const customId = `custom-${Date.now()}`;
    tracker.updateProvider('custom', {
      id: customId,
      name,
      enabled: true,
      limits: {
        maxRequests: Number(maxRequests),
        maxInputTokens: Number(maxInput),
        maxOutputTokens: Number(maxOutput),
      },
    });

    vscode.window.showInformationMessage(`Added custom provider "${name}"`);
  }

  // Private methods

  private _loadConfig(): ExtensionConfig {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return {
      enabled: vsConfig.get<boolean>('enabled', DEFAULT_CONFIG.enabled),
      autoTrack: vsConfig.get<boolean>('autoTrack', DEFAULT_CONFIG.autoTrack),
      showStatusBar: vsConfig.get<boolean>('showStatusBar', DEFAULT_CONFIG.showStatusBar),
      showAlerts: vsConfig.get<boolean>('showAlerts', DEFAULT_CONFIG.showAlerts),
      alertThreshold: vsConfig.get<number>('alertThreshold', DEFAULT_CONFIG.alertThreshold),
    };
  }
}