/**
 * AI Agent Free Tier Quota Tracker - Network Interceptor
 * Automatically detects HTTP/HTTPS requests to known AI provider API endpoints
 * and records quota usage by monkey-patching Node.js http/https modules.
 */
/* eslint-disable */

import * as vscode from 'vscode'

export interface InterceptedRequest {
  providerId: string
  hostname: string
  path: string
  method: string
  requestBodySize: number
  responseBodySize: number
  timestamp: number
  statusCode: number
}

const ENDPOINTS = [
  [/api\.openai\.com/, 'openai-gpt4o-mini'],
  [/api\.anthropic\.com/, 'anthropic-claude'],
  [/generativelanguage\.googleapis\.com/, 'google-gemini'],
  [/api\.groq\.com/, 'custom'],
  [/api\.together\.xyz/, 'custom'],
  [/api\.mistral\.ai/, 'custom'],
  [/api\.deepinfra\.com/, 'custom'],
  [/api\.replicate\.com/, 'custom'],
  [/api\.cohere\.ai/, 'custom'],
  [/api\.perplexity\.ai/, 'custom'],
  [/copilot-proxy\.githubusercontent\.com/, 'github-copilot'],
  [/api\.githubcopilot\.com/, 'github-copilot'],
  [/\.openai\.azure\.com/, 'openai-gpt4o-mini'],
  [/aiplatform\.googleapis\.com/, 'google-gemini']
] as Array<[RegExp, string]>

function match(hostname: string): string | null {
  const h = hostname.toLowerCase()
  for (const [re, id] of ENDPOINTS) {
    if (re.test(h)) return id
  }
  return null
}

function estimateTokens(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / 4.5))
}

export type RequestCallback = (data: InterceptedRequest) => void

export class NetworkInterceptor {
  private _active = false
  private _onRequest: RequestCallback
  private _httpOrig: any = null
  private _httpsOrig: any = null
  private _fetchOrig: any = null

  constructor(onRequest: RequestCallback) {
    this._onRequest = onRequest
  }

  start(): void {
    if (this._active) return
    this._active = true
    this._patchHttp()
    this._patchHttps()
    this._patchFetch()
  }

  stop(): void {
    this._active = false
    if (this._httpOrig) {
      const http = require('http')
      http.request = this._httpOrig.request
      http.get = this._httpOrig.get
      this._httpOrig = null
    }
    if (this._httpsOrig) {
      const https = require('https')
      https.request = this._httpsOrig.request
      https.get = this._httpsOrig.get
      this._httpsOrig = null
    }
    if (this._fetchOrig) {
      ;(globalThis as any).fetch = this._fetchOrig
      this._fetchOrig = null
    }
  }

  get isActive(): boolean { return this._active }

  private _emit(providerId: string, hostname: string, path: string, method: string, reqSize: number, resSize: number, status: number): void {
    this._onRequest({ providerId, hostname, path, method, requestBodySize: reqSize, responseBodySize: resSize, timestamp: Date.now(), statusCode: status })
    vscode.commands.executeCommand('agentx.recordApiUsage', {
      providerId, requests: 1,
      inputTokens: estimateTokens(reqSize),
      outputTokens: estimateTokens(resSize)
    })
  }

  private _bodySize(chunk: any): number {
    if (!chunk) return 0
    if (typeof chunk === 'string') return Buffer.byteLength(chunk, 'utf8')
    if (Buffer.isBuffer(chunk)) return chunk.length
    if (chunk instanceof Uint8Array) return chunk.length
    return 0
  }

  private _wrapReq(req: any, providerId: string, hostname: string, path: string): any {
    let reqSize = 0
    let resSize = 0
    const self = this
    const origWrite = req.write.bind(req)
    const origEnd = req.end.bind(req)
    const method = req.method || 'GET'

    req.write = function(chunk: any, ...args: any[]) {
      reqSize += self._bodySize(chunk)
      return origWrite(chunk, ...args)
    }

    req.end = function(chunk?: any, ...args: any[]) {
      if (chunk !== undefined && chunk !== null) reqSize += self._bodySize(chunk)
      req.on('response', (res: any) => {
        const chunks: Buffer[] = []
        const origData = res.push ? undefined : null
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          try { resSize = Buffer.concat(chunks).length } catch { resSize = 0 }
          self._emit(providerId, hostname, path, method, reqSize, resSize, res.statusCode || 0)
        })
      })
      return origEnd(chunk, ...args)
    }
    return req
  }

  private _patchHttp(): void {
    const http = require('http')
    this._httpOrig = { request: http.request, get: http.get }
    const self = this

    http.request = function patchedReq(options: any, callback?: any) {
      const hostname = options && typeof options === 'object' ? (options.hostname || '') : ''
      const id = hostname ? match(hostname) : null
      if (id) {
        const req = http.request(options, callback)
        return self._wrapReq(req, id, hostname, options.path || '')
      }
      return http.request(options, callback)
    }

    http.get = function patchedGet(options: any, callback?: any) {
      const hostname = options && typeof options === 'object' ? (options.hostname || '') : ''
      const id = hostname ? match(hostname) : null
      if (id) {
        const req = http.request(options, callback)
        req.end()
        return self._wrapReq(req, id, hostname, options.path || '')
      }
      return http.get(options, callback)
    }
  }

  private _patchHttps(): void {
    const https = require('https')
    this._httpsOrig = { request: https.request, get: https.get }
    const self = this

    https.request = function patchedReq(options: any, callback?: any) {
      const hostname = options && typeof options === 'object' ? (options.hostname || '') : ''
      const id = hostname ? match(hostname) : null
      if (id) {
        const req = https.request(options, callback)
        return self._wrapReq(req, id, hostname, options.path || '')
      }
      return https.request(options, callback)
    }

    https.get = function patchedGet(options: any, callback?: any) {
      const hostname = options && typeof options === 'object' ? (options.hostname || '') : ''
      const id = hostname ? match(hostname) : null
      if (id) {
        const req = https.request(options, callback)
        req.end()
        return self._wrapReq(req, id, hostname, options.path || '')
      }
      return https.get(options, callback)
    }
  }

  private _patchFetch(): void {
    const g = globalThis as any
    const orig = g.fetch
    if (typeof orig !== 'function') return
    this._fetchOrig = orig
    const self = this

    g.fetch = async function patchedFetch(input: any, init?: any) {
      let urlStr = ''
      if (typeof input === 'string') urlStr = input
      else if (input instanceof URL) urlStr = input.href
      else if (input && input.url) urlStr = input.url
      if (!urlStr) return orig(input, init)

      try {
        const url = new URL(urlStr)
        const id = match(url.hostname)
        if (id) {
          let reqSize = 0
          if (init?.body) {
            if (typeof init.body === 'string') reqSize = Buffer.byteLength(init.body, 'utf8')
            else if (init.body instanceof ArrayBuffer) reqSize = init.body.byteLength
            else if (init.body instanceof Uint8Array) reqSize = init.body.length
          }
          const res = await orig(input, init)
          const clone = res.clone()
          const text = await clone.text()
          const resSize = Buffer.byteLength(text, 'utf8')
          self._emit(id, url.hostname, url.pathname, init?.method?.toUpperCase() || 'GET', reqSize, resSize, res.status)
          return res
        }
      } catch {}
      return orig(input, init)
    }
  }
}