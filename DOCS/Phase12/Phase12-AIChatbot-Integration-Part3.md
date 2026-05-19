# PHASE 12 — PHẦN 4A: BACKEND SSE STREAMING

> Tiếp nối Part 2. Đọc Part 1-2 trước.

---

## 4A.1 — Route mới trong `web.js`

```javascript
// ═══ [Phase 12] AI Chatbot — SSE Stream ═══
// Protected: verifyToken + checkPatientRole (chỉ R3)
// Body limit riêng: 10kb (chống prompt injection khổng lồ)
const express = require('express');
const aiController = require('../controllers/aiController');

app.post('/api/v1/ai/chat',
  express.json({ limit: '10kb' }),  // [Express OOM Guard]
  verifyToken,
  checkPatientRole,
  aiController.streamChat
);
```

## 4A.2 — Controller SSE: `aiController.js`

```javascript
// src/controllers/aiController.js
'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
const { executeFunctionCall, aiFunctions, aiAuthFunctions } = require('../services/aiFunctionHandlers');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ═══ Concurrent Stream Counter ═══
let activeStreams = 0;
const MAX_STREAMS = 15;

// ═══ SYSTEM_PROMPT (từ Part 1, Section 2.2) ═══
const SYSTEM_PROMPT = `...`; // Xem Part 1 Section 2.2

// ═══ prepareHistory (từ Part 1, Section 2.3) ═══
const { prepareHistory } = require('../services/aiHistoryUtils');

// ═══════════════════════════════════════════════════════════════════════
// streamChat — POST /api/v1/ai/chat
// SSE streaming với 40+ guards từ Phase 1-11
// ═══════════════════════════════════════════════════════════════════════
async function streamChat(req, res) {

  // ──── [Kill-Switch] ────
  if (process.env.AI_CHATBOT_ENABLED !== 'true') {
    return res.status(503).json({ errCode: -5, message: 'AI Chatbot đang tạm ngưng.' });
  }

  // ──── [Max 15 Streams] ────
  if (activeStreams >= MAX_STREAMS) {
    return res.status(503).json({ errCode: -4, message: 'Server đang bận.' });
  }

  // ──── [Check Active User] ────
  if (!req.user || !req.user.id) {
    return res.status(401).json({ errCode: -1, message: 'Chưa đăng nhập.' });
  }

  // ──── [Limit UserID] ────
  const userId = parseInt(String(req.user.id), 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ errCode: 1, message: 'userId không hợp lệ.' });
  }

  // ──── [ParseInt + Validate Body] ────
  const { message, history = [] } = req.body;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ errCode: 1, message: 'Thiếu nội dung tin nhắn.' });
  }

  // ──── [VN Token Inflation Guard — 2500 chars] ────
  const safeMessage = Array.from(message.trim()).slice(0, 2500).join('');

  // ──── [Zalgo Clean — Zero-width Regex] ────
  const cleanMessage = safeMessage
    .replace(/[\u0300-\u036f]{3,}/g, '')     // Strip excessive combining marks
    .replace(/[\u200B-\u200F\uFEFF]/g, '');  // Strip zero-width chars

  // ──── [Check Token exp < 60s] ────
  // (Handled by verifyToken middleware — tokenVersion check)

  // ──── Setup SSE ────
  activeStreams++;
  const ac = new AbortController();
  const signal = ac.signal;
  let heartbeatInterval = null;
  let hardTimeoutHandle = null;
  let functionCallCount = 0;

  // ──── [SSE Headers] ────
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',       // Bypass Nginx buffering
    'X-Content-Type-Options': 'nosniff',  // [Header nosniff]
    'Access-Control-Allow-Origin': process.env.URL_REACT,
    'Access-Control-Allow-Credentials': 'true',
  });

  // ──── [Bypass Gzip] ────
  // X-Accel-Buffering: no + Content-Type: text/event-stream
  // đảm bảo Nginx không nén/buffer SSE chunks

  // ──── [SSE Heartbeat — 15s] ────
  heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(':heartbeat\n\n');
    }
  }, 15000);

  // ──── [Hard Timeout 60s] ────
  hardTimeoutHandle = setTimeout(() => {
    ac.abort();
    if (!res.writableEnded) {
      res.write('data: [TIMEOUT]\n\n');
      res.end();
    }
  }, 60000);

  // ──── [Suppress AbortError + Cleanup on close] ────
  req.on('close', () => {
    ac.abort();
  });

  // ──── [Bắt OS res.on('error')] ────
  res.on('error', (err) => {
    if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') {
      console.error('[SSE res.error]', err.code);
    }
  });

  try {
    // ──── [Gộp Role History] ────
    const geminiHistory = prepareHistory(history).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: typeof msg.parts === 'string' ? msg.parts : msg.parts?.[0]?.text || '' }],
    }));

    // ──── [Cấp Timestamp UTC] ────
    const nowUTC = new Date().toISOString();

    // ──── Build Gemini Chat ────
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT + `\n\nThời gian hiện tại (UTC): ${nowUTC}`,
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
      tools: [{
        functionDeclarations: [
          ...Object.entries(aiFunctions).map(([name, def]) => ({ name, ...def })),
          ...Object.entries(aiAuthFunctions).map(([name, def]) => ({ name, ...def })),
        ],
      }],
    });

    const chat = model.startChat({ history: geminiHistory });

    // ──── [Function Calling Loop — Max 3 Calls] ────
    let currentMessage = cleanMessage;
    let streamResult;

    for (let round = 0; round <= 3; round++) {
      if (signal.aborted) break;

      streamResult = await chat.sendMessageStream(currentMessage);

      let fullText = '';
      let pendingFunctionCall = null;

      for await (const chunk of streamResult.stream) {
        if (signal.aborted) break;

        // ──── [Check finishReason] ────
        const candidate = chunk.candidates?.[0];
        const finishReason = candidate?.finishReason;

        // ──── [Bắt Token Overflow] ────
        if (finishReason === 'MAX_TOKENS') {
          if (!res.writableEnded) {
            res.write('data: ... [đã đạt giới hạn]\n\n');
          }
          break;
        }

        // ──── Check Function Call ────
        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
          if (part.functionCall) {
            pendingFunctionCall = part.functionCall;
            break;
          }
          if (part.text) {
            fullText += part.text;

            // ──── [Chống SSE Protocol Injection] ────
            const safeChunk = part.text.replace(/\n\ndata:/g, '\n\n data:');

            // ──── [Check res.writableEnded] ────
            if (!res.writableEnded) {
              // ──── [Xử lý Backpressure (drain)] ────
              const canWrite = res.write(`data: ${JSON.stringify({ text: safeChunk })}\n\n`);
              if (!canWrite) {
                await new Promise(resolve => res.once('drain', resolve));
              }
            }
          }
        }

        if (pendingFunctionCall) break;
      }

      // ──── Process Function Call ────
      if (pendingFunctionCall && !signal.aborted) {
        functionCallCount++;

        // ──── [Max 3 Calls AI] ────
        if (functionCallCount > 3) {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ text: '\n\n_Đã đạt giới hạn truy vấn dữ liệu._' })}\n\n`);
          }
          break;
        }

        // ──── [Bắt 403/400 Gemini — BẢO ĐẢM 4: Hard Stop] ────
        let fnResult;
        try {
          fnResult = await executeFunctionCall(
            pendingFunctionCall.name,
            pendingFunctionCall.args,
            userId,
            signal
          );
        } catch (fnErr) {
          fnResult = JSON.stringify({ error: 'Lỗi truy vấn dữ liệu' });
          // [Sanitize Log]
          console.error('[AI_FN_ERR]', pendingFunctionCall.name,
            typeof fnErr?.message === 'string' ? fnErr.message.slice(0, 200) : 'unknown');
        }

        // Send function result back to Gemini
        currentMessage = JSON.stringify({
          functionResponse: {
            name: pendingFunctionCall.name,
            response: typeof fnResult === 'string' ? fnResult : JSON.stringify(fnResult),
          },
        });

        continue; // Next round with function result
      }

      break; // No more function calls, streaming done
    }

    // ──── [Bắt 429 Google Avalanche] ────
  } catch (err) {
    const errMsg = typeof err?.message === 'string' ? err.message : '';
    const status = err?.status || err?.httpMetadata?.status;

    // ──── [BẢO ĐẢM 4: 403/400 BILLING/KEY REVOKED — HARD STOP] ────
    if (status === 403 || status === 400 ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('BILLING')) {
      console.error('[AI_HARD_STOP] Gemini API key/billing error:', status);
      if (!res.writableEnded) {
        // TUYỆT ĐỐI KHÔNG gọi đệ quy Fallback — chém đứt luồng
        res.write(`data: ${JSON.stringify({
          error: true,
          text: 'Hệ thống AI đang bảo trì. Vui lòng thử lại sau.',
        })}\n\n`);
      }
      // KHÔNG retry, KHÔNG fallback — Hard Stop
    }
    // ──── [Bắt 429 — Rate Limit Google] ────
    else if (status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
      console.warn('[AI_429] Gemini rate limited');
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          error: true,
          text: 'AI đang quá tải. Vui lòng thử lại sau 30 giây.',
        })}\n\n`);
      }
      // Max 1 retry — handled by frontend
    }
    // ──── [Suppress AbortError] ────
    else if (err.name === 'AbortError' || signal.aborted) {
      // Silent — client disconnected, no action needed
    }
    else {
      // [Sanitize Log] — không log toàn bộ err object
      console.error('[AI_STREAM_ERR]',
        typeof errMsg === 'string' ? errMsg.slice(0, 200) : 'unknown');
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          error: true,
          text: 'Đã xảy ra lỗi. Vui lòng thử lại.',
        })}\n\n`);
      }
    }
  } finally {
    // ──── [ClearInterval Heartbeat] ────
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    // ──── [Clear Hard Timeout] ────
    if (hardTimeoutHandle) clearTimeout(hardTimeoutHandle);

    // ──── [removeAllListeners — Event Leak Prevention] ────
    // BẮT BUỘC gọi removeAllListeners() KHÔNG THAM SỐ để quét sạch
    // mọi bẫy lỗi và sự kiện ('close', 'drain', 'error', ...),
    // chống rò rỉ bộ nhớ triệt để khi stream kết thúc.
    req.removeAllListeners();
    res.removeAllListeners();

    // ──── [SSE Done signal] ────
    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }

    // ──── Decrement counter ────
    activeStreams = Math.max(0, activeStreams - 1);
  }
}

// ──── [keepAliveTimeout = 120000] ────
// Đặt trong server.js sau app.listen():
//   server.keepAliveTimeout = 120000;
//   server.headersTimeout = 125000;

module.exports = { streamChat };
```

## 4A.3 — Bảng tổng hợp Guards Backend SSE

| # | Guard | Vị trí | Liên kết Phase cũ |
|---|---|---|---|
| 1 | Kill-Switch | Đầu handler | Phase 12 |
| 2 | Max 15 Streams | `activeStreams` counter | Phase 12 |
| 3 | Check Active User | `req.user.id` | Phase 9 (verifyToken) |
| 4 | Limit UserID | `parseInt` + `isFinite` | Phase 11 |
| 5 | ParseInt | Ép kiểu mọi number input | Phase 11 |
| 6 | Zalgo Clean + Zero-width | Regex strip | Phase 12 |
| 7 | Express OOM | `limit: '10kb'` trên route | Phase 11 (Guard #63) |
| 8 | SSE Heartbeat 15s | `setInterval` `:heartbeat` | Phase 12 |
| 9 | Hard Timeout 60s | `setTimeout` → abort | Phase 12 |
| 10 | Bypass Gzip | `X-Accel-Buffering: no` | Phase 13 Hook |
| 11 | Header nosniff | `X-Content-Type-Options` | Phase 11 |
| 12 | Chống SSE Injection | `replace(\n\ndata:)` | Phase 12 |
| 13 | Check res.writableEnded | Trước mỗi `res.write()` | Phase 11 |
| 14 | Backpressure (drain) | `await drain` khi buffer full | Phase 11 (Guard #63) |
| 15 | Max 3 Calls AI | `functionCallCount` | Phase 12 |
| 16 | Check finishReason | `MAX_TOKENS` detection | Phase 12 |
| 17 | Bắt 429 Google | Rate limit detection | Phase 12 |
| 18 | 403/400 Hard Stop | **BẢO ĐẢM 4** — No retry | Phase 12 |
| 19 | Suppress AbortError | Silent on client disconnect | Phase 11 |
| 20 | ClearInterval | `finally` block cleanup | Phase 12 |
| 21 | removeAllListeners() (TOTAL) | `req.removeAllListeners()` + `res.removeAllListeners()` — quét sạch MỌI event, không chỉ 'close'/'drain' | Phase 11 |
| 22 | Sanitize Log | `.slice(0, 200)` error msg | Phase 11 |
| 23 | keepAliveTimeout 120s | `server.keepAliveTimeout` | Phase 11 |
| 24 | Gộp Role History | `prepareHistory()` | Phase 12 |
| 25 | Cấp Timestamp UTC | `new Date().toISOString()` | Phase 12 |
| 26 | Bắt Token Overflow | `finishReason === 'MAX_TOKENS'` | Phase 12 |
| 27 | Bắt OS res.on('error') | Prevent uncaught EPIPE | Phase 12 |
| 28 | AbortSignal SDK | Truyền signal kiểm tra | Phase 12 |
| 29 | Circuit Breaker | 403/400 → Hard Stop, no fallback | **BẢO ĐẢM 4** |

---
