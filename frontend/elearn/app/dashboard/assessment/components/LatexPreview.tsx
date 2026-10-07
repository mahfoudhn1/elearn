"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

/**
 * LaTeX preview for the teacher editors. Renders `$...$` (inline) and `$$...$$`
 * (display) with KaTeX, loading it once from a CDN. Text with no math renders as
 * plain text. Same rendering approach as the mobile `MathText` (see
 * `docs/mobile/00_math_rtl_spike.md`); bundling KaTeX is the pre-ship follow-up.
 */

declare global {
  interface Window {
    katex?: {
      render: (
        tex: string,
        el: HTMLElement,
        options: { throwOnError: boolean; displayMode: boolean },
      ) => void;
    };
  }
}

const KATEX_VERSION = "0.16.11";
const KATEX_BASE = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`;

const SPLIT = /(\$\$[^$]+\$\$|\$[^$\n]+\$)/g;

export interface LatexPreviewProps {
  text: string;
  className?: string;
}

export function LatexPreview({ text, className }: LatexPreviewProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const render = () => {
    const container = ref.current;
    const katex = window.katex;
    if (!container || !katex) return;
    const nodes = container.querySelectorAll<HTMLElement>("[data-tex]");
    nodes.forEach((node) => {
      const tex = node.getAttribute("data-tex") ?? "";
      try {
        katex.render(tex, node, {
          throwOnError: false,
          displayMode: node.dataset.display === "true",
        });
      } catch {
        node.textContent = `$${tex}$`;
      }
    });
  };

  useEffect(() => {
    render();
    // Re-render when the text changes and KaTeX is (already) available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const parts = (text ?? "").split(SPLIT);

  return (
    <>
      <link rel="stylesheet" href={`${KATEX_BASE}/katex.min.css`} />
      <Script
        src={`${KATEX_BASE}/katex.min.js`}
        strategy="lazyOnload"
        onLoad={render}
      />
      <div ref={ref} className={className} dir="auto" style={{ unicodeBidi: "plaintext" }}>
        {parts.map((part, index) => {
          if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
            return (
              <div key={index} className="my-2 text-center">
                <span data-tex={part.slice(2, -2)} data-display="true" />
              </div>
            );
          }
          if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
            return <span key={index} data-tex={part.slice(1, -1)} />;
          }
          return (
            <span key={index} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        })}
      </div>
    </>
  );
}
