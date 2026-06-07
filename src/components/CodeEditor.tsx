import Editor, { type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  highlightedLine?: number | null;
}

export function CodeEditor({ value, onChange, language = 'python', highlightedLine }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monaco.editor.defineTheme('algoviz-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '93c5fd' },
        { token: 'string', foreground: 'a7f3d0' },
        { token: 'number', foreground: 'fbbf24' },
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editor.lineHighlightBackground': '#1e293b',
        'editor.selectionBackground': '#1e40af55',
      },
    });
    monaco.editor.setTheme('algoviz-dark');
  };

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (highlightedLine == null) {
      decorationsRef.current = ed.deltaDecorations(decorationsRef.current, []);
      return;
    }
    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, [
      {
        range: { startLineNumber: highlightedLine, startColumn: 1, endLineNumber: highlightedLine, endColumn: 999 },
        options: {
          isWholeLine: true,
          className: 'monaco-line-highlight',
          glyphMarginClassName: 'monaco-glyph-highlight',
        },
      },
    ]);
  }, [highlightedLine]);

  return (
    <Editor
      value={value}
      onChange={(v) => onChange(v ?? '')}
      language={language}
      onMount={handleMount}
      theme="algoviz-dark"
      options={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderWhitespace: 'none',
        // Word wrap so long lines stay visible on narrow viewports without
        // horizontal scrolling — important for tablets and phones.
        wordWrap: 'on',
        wrappingIndent: 'indent',
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        padding: { top: 12, bottom: 12 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        renderLineHighlight: 'all',
        // Automatic re-layout on container resize (tab switches, rotation, etc).
        automaticLayout: true,
      }}
    />
  );
}
