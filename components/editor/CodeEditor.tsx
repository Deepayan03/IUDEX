"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// Added props interface so we can customize the left/right panes
interface CodeEditorProps {
  language?: string;
  defaultValue?: string;
}

export default function CodeEditor({ 
  language = "typescript", 
  defaultValue = '// Start coding...' 
}: CodeEditorProps) {
  const [theme, setTheme] = useState("vs-dark");

  useEffect(() => {
    // Monaco doesn't load instantly, so setting an explicit dark background 
    // on the container via Tailwind in the parent prevents a white flash.
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "vs-dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme={theme}
      value={defaultValue}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        minimap: { enabled: true, scale: 0.75 }, // Enabled to match your image
        automaticLayout: true,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        padding: { top: 16 },
        renderLineHighlight: "all",
        overviewRulerBorder: false, // Removes the ugly border on the right scrollbar
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        }
      }}
    />
  );
}