/**
 * AI Agent Free Tier Quota Tracker
 * Tracks and monitors free tier quota usage across AI providers
 * Supports both manual tracking and automatic network interception
 * Displays quota info in the VS Code activity bar sidebar
 */

import * as vscode from 'vscode'
import { QuotaTracker } from './quotaTracker'
import { StatusBarManager } from './statusBar'
import { QuotaTreeDataProvider } from './quotaTreeProvider'
import { ConfigManager } from './config'
import { NetworkInterceptor } from './networkInterceptor'
import { AIProvider } from './types'

let quotaTracker: QuotaTracker | undefined
let statusBarManager: StatusBarManager | undefined
let configManager: ConfigManager | undefined
let networkInterceptor: NetworkInterceptor | undefined
let treeDataProvider: QuotaTreeDataProvider | undefined

export function activate(context: vscode.ExtensionContext) {
  // Initialize core components
  quotaTracker = new QuotaTracker(context)
  statusBarManager = new StatusBarManager()
  configManager = new ConfigManager()

  // Initial status bar update
  statusBarManager.update(quotaTracker.getProviders())

  // --- Register Sidebar Tree View ---
  treeDataProvider = new QuotaTreeDataProvider()
  treeDataProvider.refresh(quotaTracker.getProviders())

  const treeView = vscode.window.createTreeView('agentxQuotaSidebar', {
    treeDataProvider,
    showCollapseAll: true
  })

  context.subscriptions.push(treeView)

  // Listen for quota updates to refresh UI
  context.subscriptions.push(
    quotaTracker.onDidUpdateQuota((providers: AIProvider[]) => {
      statusBarManager?.update(providers)
      treeDataProvider?.refresh(providers)
    })
  )

  // --- Network Interceptor for Auto-Tracking ---
  networkInterceptor = new NetworkInterceptor(() => {
    // Callback fires for every detected AI API call
    // Recording is handled internally via the recordApiUsage command
  })

  // Start auto-tracking if enabled in config
  const cfg = configManager.get()
  if (cfg.autoTrack) 
    networkInterceptor.start()
  

  // --- Commands ---

  // Record usage auto-detected via network interceptor
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.recordApiUsage', (msg: { providerId: string; requests: number; inputTokens: number; outputTokens: number }) => {
      if (!quotaTracker) return
      quotaTracker.recordUsage(msg.providerId, msg.requests, msg.inputTokens, msg.outputTokens)
    })
  )

  // Toggle auto-tracking on/off
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.toggleAutoTrack', () => {
      if (!networkInterceptor) return
      if (networkInterceptor.isActive) {
        networkInterceptor.stop()
        vscode.window.showInformationMessage('Auto-tracking stopped')
      } else {
        networkInterceptor.start()
        vscode.window.showInformationMessage('Auto-tracking started - monitoring AI API calls')
      }
    })
  )

  // Show the quota sidebar (reveal in activity bar)
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.showQuotaPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.agentx-quota-sidebar')
    })
  )

  // Refresh quota data
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.refreshQuota', () => {
      if (quotaTracker && treeDataProvider) 
        treeDataProvider.refresh(quotaTracker.getProviders())
      
    })
  )

  // Reset all provider quotas
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.resetAllQuota', () => {
      quotaTracker?.resetAllUsage()
      vscode.window.showInformationMessage('All AI provider quotas have been reset')
    })
  )

  // Reset a specific provider's quota
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.resetProvider', (providerId: string) => {
      const provider = quotaTracker?.getProvider(providerId)
      quotaTracker?.resetProvider(providerId)
      if (provider) 
        vscode.window.showInformationMessage(`"${provider.name}" quota reset`)
      
    })
  )

  // Toggle a provider on/off
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.toggleProvider', (providerId: string) => {
      quotaTracker?.toggleProvider(providerId)
    })
  )

  // Record usage manually
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.recordUsage', async (providerId?: string, data?: { requests: number; inputTokens: number; outputTokens: number }) => {
      if (!quotaTracker) return

      if (providerId && data) {
        quotaTracker.recordUsage(providerId, data.requests, data.inputTokens, data.outputTokens)
        vscode.window.showInformationMessage('Recorded usage for ' + providerId)
      } else {
        await ConfigManager.promptRecordUsage({
          getProviders: () => quotaTracker!.getProviders(),
          recordUsage: (id: string, req: number, inT: number, outT: number) => quotaTracker!.recordUsage(id, req, inT, outT)
        })
      }
    })
  )

  // Edit provider limits
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.editLimits', async (providerId?: string) => {
      if (!quotaTracker) return

      if (providerId) {
        const p = quotaTracker.getProvider(providerId)
        if (!p) return

        const maxRequests = await vscode.window.showInputBox({
          prompt: 'Max requests',
          value: String(p.limits.maxRequests),
          validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null
        })
        if (!maxRequests) return

        const maxInput = await vscode.window.showInputBox({
          prompt: 'Max input tokens',
          value: String(p.limits.maxInputTokens),
          validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null
        })
        if (!maxInput) return

        const maxOutput = await vscode.window.showInputBox({
          prompt: 'Max output tokens',
          value: String(p.limits.maxOutputTokens),
          validateInput: v => isNaN(Number(v)) ? 'Enter a valid number' : null
        })
        if (!maxOutput) return

        quotaTracker.updateLimits(providerId, {
          maxRequests: Number(maxRequests),
          maxInputTokens: Number(maxInput),
          maxOutputTokens: Number(maxOutput)
        })

        vscode.window.showInformationMessage('Updated limits for ' + p.name)
      } else 
        await ConfigManager.promptEditLimits(quotaTracker)
      
    })
  )

  // Export quota data
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.exportQuota', async () => {
      if (!quotaTracker) return

      const json = quotaTracker.exportData()
      const doc = await vscode.workspace.openTextDocument({
        content: json,
        language: 'json'
      })
      await vscode.window.showTextDocument(doc)
      vscode.window.showInformationMessage('Quota data exported')
    })
  )

  // Import quota data
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.importQuota', async () => {
      if (!quotaTracker) return

      const result = await vscode.window.showOpenDialog({
        filters: { 'JSON Files': ['json'] },
        canSelectFiles: true,
        canSelectMany: false
      })

      if (!result || result.length === 0) return

      const content = (await vscode.workspace.fs.readFile(result[0])).toString()
      const success = quotaTracker.importData(content)

      if (success)
        vscode.window.showInformationMessage('Quota data imported successfully')
      else
        vscode.window.showErrorMessage('Failed to import quota data. Invalid format.')
    })
  )

  // Show quota alerts
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.showAlerts', () => {
      if (!quotaTracker) return

      const alerts = quotaTracker.getQuotaAlerts()
      if (alerts.length === 0) {
        vscode.window.showInformationMessage('All quotas are healthy! No alerts.')
        return
      }

      const items = alerts.flatMap(a =>
        a.warnings.map(w => ({
          label: '$(warning) ' + a.providerName,
          detail: w
        }))
      )

      vscode.window.showQuickPick(items, {
        placeHolder: 'Current quota alerts',
        matchOnDetail: true
      })
    })
  )

  // List all providers with their status (opens quick pick)
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.listProviders', async () => {
      const tracker = quotaTracker
      if (!tracker) return

      const providers = tracker.getProviders()
      const items = providers.map(p => {
        const reqPct = p.limits.maxRequests > 0
          ? Math.round((p.usage.requests / p.limits.maxRequests) * 100)
          : 0
        const icon = p.enabled
          ? reqPct >= 100 ? '$(alert)' : reqPct >= 80 ? '$(warning)' : '$(check)'
          : '$(circle-slash)'
        return {
          label: icon + ' ' + p.name,
          description: p.enabled ? 'Requests: ' + reqPct + '%' : 'Disabled',
          detail: p.enabled
            ? 'Reset: ' + tracker.getTimeUntilReset(p.id)
            : 'Click to enable',
          providerId: p.id,
          enabled: p.enabled
        }
      })

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'AI Providers - select to toggle',
        matchOnDescription: true
      })

      if (selection)
        tracker.toggleProvider(selection.providerId)
    })
  )

  // --- Tree View Context Menu Actions ---

  // Toggle provider from sidebar context menu
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.sidebarToggleProvider', (item: any) => {
      if (item && item.provider) 
        quotaTracker?.toggleProvider(item.provider.id)
      
    })
  )

  // Reset provider from sidebar context menu
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.sidebarResetProvider', (item: any) => {
      if (item && item.provider) 
        quotaTracker?.resetProvider(item.provider.id)
      
    })
  )

  // Record usage from sidebar context menu
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.sidebarRecordUsage', (item: any) => {
      if (item && item.provider) {
        vscode.commands.executeCommand('agentx.recordUsage', item.provider.id, {
          requests: 1,
          inputTokens: 0,
          outputTokens: 0
        })
      }
    })
  )

  // Edit limits from sidebar context menu
  context.subscriptions.push(
    vscode.commands.registerCommand('agentx.sidebarEditLimits', (item: any) => {
      if (item && item.provider) 
        vscode.commands.executeCommand('agentx.editLimits', item.provider.id)
      
    })
  )

  // --- Configuration change listener ---
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('agentx.quotaTracker')) {
        configManager = new ConfigManager()
        const cfg = configManager.get()

        if (!cfg.showStatusBar) {
          statusBarManager?.dispose()
          statusBarManager = undefined
        } else if (!statusBarManager) {
          statusBarManager = new StatusBarManager()
          if (quotaTracker)
            statusBarManager.update(quotaTracker.getProviders())
        }

        // Handle autoTrack toggle
        if (networkInterceptor) {
          if (cfg.autoTrack && !networkInterceptor.isActive) 
            networkInterceptor.start()
           else if (!cfg.autoTrack && networkInterceptor.isActive) 
            networkInterceptor.stop()
          
        }
      }
    })
  )
}

export function deactivate(): void {
  statusBarManager?.dispose()
  networkInterceptor?.stop()
}
