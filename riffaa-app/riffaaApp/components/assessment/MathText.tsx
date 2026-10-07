import { useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useTheme } from '../../hooks/useTheme';
import { AppText, type TextVariant } from '../ui';

/**
 * Renders mixed text where `$...$` (inline) and `$$...$$` (display) spans are
 * LaTeX rendered by KaTeX inside a WebView. Text with no math segments uses the
 * normal {@link AppText} fast path (no WebView, no cost).
 *
 * SPIKE (Phase A8): see `docs/mobile/00_math_rtl_spike.md` for the measured
 * Android/iOS behaviour and the known limits (CDN dependency, height handshake,
 * WebView cost per bubble). This component is the single place that decides how
 * math is drawn; screens never embed a WebView directly.
 *
 * RTL: the surrounding document is `dir="auto"` with `unicode-bidi: plaintext`,
 * so Arabic runs render RTL while embedded math stays LTR (KaTeX's default, which
 * is correct for mathematics).
 */

const MATH_SPLIT = /(\$\$[^$]+\$\$|\$[^$\n]+\$)/g;
const KATEX_VERSION = '0.16.11';
const KATEX_BASE = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`;

interface Segment {
  kind: 'text' | 'inline' | 'display';
  value: string;
}

function parseSegments(source: string): Segment[] {
  const segments: Segment[] = [];
  const parts = source.split(MATH_SPLIT);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      segments.push({ kind: 'display', value: part.slice(2, -2) });
    } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      segments.push({ kind: 'inline', value: part.slice(1, -1) });
    } else {
      segments.push({ kind: 'text', value: part });
    }
  }
  return segments;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(segments: Segment[], theme: 'light' | 'dark', fontSize: number): string {
  const ink = theme === 'dark' ? '#F8FAFC' : '#1E2A3B';
  const body = segments
    .map((segment) => {
      if (segment.kind === 'text') {
        // Preserve newlines; escape HTML.
        return `<span class="text">${escapeHtml(segment.value).replace(/\n/g, '<br/>')}</span>`;
      }
      const tex = escapeHtml(segment.value);
      const display = segment.kind === 'display';
      const target = display
        ? `<div class="math-display" data-tex="${tex}"></div>`
        : `<span class="math-inline" data-tex="${tex}"></span>`;
      return target;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="${KATEX_BASE}/katex.min.css" crossorigin="anonymous" />
<script src="${KATEX_BASE}/katex.min.js" crossorigin="anonymous"></script>
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    direction: auto;
    unicode-bidi: plaintext;
    color: ${ink};
    font-size: ${fontSize}px;
    line-height: 1.55;
    -webkit-text-size-adjust: 100%;
    font-family: -apple-system, "IBM Plex Sans Arabic", "Segoe UI", system-ui, sans-serif;
  }
  .math-display { display: block; text-align: center; margin: 8px 0; overflow-x: auto; }
  .katex { font-size: 1em; }
  .fallback { color: #DC2626; font-family: ui-monospace, Menlo, monospace; }
</style>
</head>
<body>
<div id="root">${body}</div>
<script>
  (function () {
    function render() {
      var nodes = document.querySelectorAll('[data-tex]');
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var tex = node.getAttribute('data-tex') || '';
        if (!window.katex) {
          node.textContent = '$' + tex + '$';
          node.className = (node.className || '') + ' fallback';
          continue;
        }
        try {
          window.katex.render(tex, node, {
            throwOnError: false,
            displayMode: node.className.indexOf('math-display') !== -1,
          });
        } catch (e) {
          node.textContent = '$' + tex + '$';
        }
      }
      postHeight();
    }
    function postHeight() {
      var h = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight || 0);
      window.ReactNativeWebView &&
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: h }));
    }
    function boot() {
      if (window.katex) { render(); return; }
      var tries = 0;
      var timer = setInterval(function () {
        if (window.katex || ++tries > 40) { clearInterval(timer); render(); }
      }, 50);
    }
    if (document.readyState === 'complete') { boot(); }
    else { window.addEventListener('load', boot); }
    window.addEventListener('resize', postHeight);
  })();
</script>
</body>
</html>`;
}

export interface MathTextProps {
  children: string;
  /** Body text size; math scales with it. */
  variant?: TextVariant;
  tone?: 'ink' | 'muted' | 'subtle' | 'brand' | 'onBrand';
  align?: 'start' | 'center' | 'end';
  className?: string;
  /** Minimum rendered height while the WebView measures itself. */
  minHeight?: number;
}

const VARIANT_FONT_SIZE: Partial<Record<TextVariant, number>> = {
  micro: 11,
  caption: 12,
  bodySm: 14,
  body: 16,
  title: 18,
  heading: 22,
  display: 28,
  displayLg: 34,
};

/**
 * Bilingual (Arabic/French) rich text with optional LaTeX.
 *
 * Fast path: no `$` → plain {@link AppText}. Math path: a transparent,
 * non-interactive WebView that reports its content height so it can size itself.
 */
export function MathText({
  children,
  variant = 'body',
  className,
  minHeight = 24,
}: MathTextProps) {
  const { theme } = useTheme();
  const segments = useMemo(() => parseSegments(children ?? ''), [children]);
  const hasMath = segments.some((segment) => segment.kind !== 'text');
  const [height, setHeight] = useState(minHeight);
  const lastHeight = useRef(minHeight);

  const html = useMemo(
    () => buildHtml(segments, theme, VARIANT_FONT_SIZE[variant] ?? 16),
    [segments, theme, variant],
  );

  if (!hasMath) {
    return (
      <AppText variant={variant} className={className}>
        {children}
      </AppText>
    );
  }

  return (
    <View
      className={className}
      pointerEvents="none"
      style={{ height: Math.max(height, minHeight), backgroundColor: 'transparent' }}
    >
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        transparent
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              height?: number;
            };
            if (payload.type === 'height' && typeof payload.height === 'number') {
              const next = Math.max(minHeight, Math.ceil(payload.height));
              if (Math.abs(next - lastHeight.current) > 1) {
                lastHeight.current = next;
                setHeight(next);
              }
            }
          } catch {
            // Ignore non-JSON messages.
          }
        }}
      />
    </View>
  );
}
