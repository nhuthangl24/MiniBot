"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Fragment } from "react";

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
}

type HighlightToken = {
  text: string;
  className: string;
};

const EDITOR_THEME = {
  plain: "text-[#d4d4d4]",
  comment: "text-[#6a9955]",
  keyword: "text-[#c586c0]",
  string: "text-[#ce9178]",
  number: "text-[#b5cea8]",
  function: "text-[#dcdcaa]",
  variable: "text-[#9cdcfe]",
  property: "text-[#4fc1ff]",
  operator: "text-[#d4d4d4]",
  accent: "text-[#569cd6]",
};

function getLanguageFromFilename(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "env") return "env";
  if (["py"].includes(ext)) return "python";
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext))
    return "javascript";
  if (["json"].includes(ext)) return "json";
  if (["sh", "bash"].includes(ext)) return "shell";
  if (["yml", "yaml"].includes(ext)) return "yaml";
  return "plain";
}

function pushMatchTokens(
  line: string,
  regex: RegExp,
  mapper: (match: RegExpExecArray) => HighlightToken[],
) {
  const tokens: HighlightToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const globalRegex = new RegExp(
    regex.source,
    regex.flags.includes("g") ? regex.flags : `${regex.flags}g`,
  );

  while ((match = globalRegex.exec(line))) {
    if (match.index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, match.index),
        className: EDITOR_THEME.plain,
      });
    }
    tokens.push(...mapper(match));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), className: EDITOR_THEME.plain });
  }

  return tokens.length
    ? tokens
    : [{ text: line, className: EDITOR_THEME.plain }];
}

function highlightLine(line: string, language: string) {
  if (!line) return [{ text: " ", className: EDITOR_THEME.plain }];

  if (language === "env") {
    if (/^\s*#/.test(line)) {
      return [{ text: line, className: EDITOR_THEME.comment }];
    }
    const equalIndex = line.indexOf("=");
    if (equalIndex > -1) {
      return [
        { text: line.slice(0, equalIndex), className: EDITOR_THEME.property },
        { text: "=", className: EDITOR_THEME.operator },
        { text: line.slice(equalIndex + 1), className: EDITOR_THEME.string },
      ];
    }
    return [{ text: line, className: EDITOR_THEME.plain }];
  }

  if (language === "json" || language === "yaml") {
    if (/^\s*#/.test(line)) {
      return [{ text: line, className: EDITOR_THEME.comment }];
    }
    return pushMatchTokens(
      line,
      /("(?:\\.|[^"])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(?:\.\d+)?\b)|([{}\[\]:,])/g,
      (match) => {
        if (match[1]) {
          const nextChar = line
            .slice(match.index + match[0].length)
            .trimStart()[0];
          return [
            {
              text: match[1],
              className:
                nextChar === ":" ? EDITOR_THEME.property : EDITOR_THEME.string,
            },
          ];
        }
        if (match[2])
          return [{ text: match[2], className: EDITOR_THEME.keyword }];
        if (match[3])
          return [{ text: match[3], className: EDITOR_THEME.number }];
        return [{ text: match[4], className: EDITOR_THEME.operator }];
      },
    );
  }

  if (language === "python") {
    if (/^\s*#/.test(line)) {
      return [{ text: line, className: EDITOR_THEME.comment }];
    }
    return pushMatchTokens(
      line,
      /(#.*$)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|(\b(?:from|import|def|class|if|elif|else|return|async|await|for|while|try|except|with|as|pass|raise|None|True|False)\b)|(\b\d+(?:\.\d+)?\b)|(@\w+)|(\b[A-Za-z_]\w*(?=\())/g,
      (match) => {
        if (match[1])
          return [{ text: match[1], className: EDITOR_THEME.comment }];
        if (match[2])
          return [{ text: match[2], className: EDITOR_THEME.string }];
        if (match[3])
          return [{ text: match[3], className: EDITOR_THEME.keyword }];
        if (match[4])
          return [{ text: match[4], className: EDITOR_THEME.number }];
        if (match[5])
          return [{ text: match[5], className: EDITOR_THEME.accent }];
        return [{ text: match[6], className: EDITOR_THEME.function }];
      },
    );
  }

  if (language === "javascript") {
    if (/^\s*\/\//.test(line)) {
      return [{ text: line, className: EDITOR_THEME.comment }];
    }
    return pushMatchTokens(
      line,
      /(\/\/.*$)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)|(\b(?:import|from|export|default|const|let|var|function|return|if|else|async|await|class|new|true|false|null|undefined)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][\w$]*(?=\())/g,
      (match) => {
        if (match[1])
          return [{ text: match[1], className: EDITOR_THEME.comment }];
        if (match[2])
          return [{ text: match[2], className: EDITOR_THEME.string }];
        if (match[3])
          return [{ text: match[3], className: EDITOR_THEME.keyword }];
        if (match[4])
          return [{ text: match[4], className: EDITOR_THEME.number }];
        return [{ text: match[5], className: EDITOR_THEME.function }];
      },
    );
  }

  if (language === "shell") {
    if (/^\s*#/.test(line)) {
      return [{ text: line, className: EDITOR_THEME.comment }];
    }
    return pushMatchTokens(
      line,
      /(#.*$)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|(\$(?:\w+|\{[^}]+\}))|(\b(?:if|then|else|fi|for|do|done|case|esac|export)\b)/g,
      (match) => {
        if (match[1])
          return [{ text: match[1], className: EDITOR_THEME.comment }];
        if (match[2])
          return [{ text: match[2], className: EDITOR_THEME.string }];
        if (match[3])
          return [{ text: match[3], className: EDITOR_THEME.variable }];
        return [{ text: match[4], className: EDITOR_THEME.keyword }];
      },
    );
  }

  return [{ text: line, className: EDITOR_THEME.plain }];
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const params = useParams<{ id: string }>();
  const serverId = params?.id as string;

  const [path, setPath] = useState("/");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [viewFileContent, setViewFileContent] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const editorLineCount = viewFileContent
    ? Math.max(1, viewFileContent.content.split("\n").length)
    : 1;
  const editorLines = Array.from(
    { length: editorLineCount },
    (_, index) => index + 1,
  );
  const editorLanguage = viewFileContent
    ? getLanguageFromFilename(viewFileContent.name)
    : "plain";

  const syncEditorScroll = () => {
    if (!editorRef.current || !lineNumberRef.current || !highlightRef.current)
      return;
    lineNumberRef.current.scrollTop = editorRef.current.scrollTop;
    highlightRef.current.scrollTop = editorRef.current.scrollTop;
    highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
  };

  const load = useCallback(
    async (p: string) => {
      setLoading(true);
      setError("");
      setSelected(new Set());
      try {
        const res = await fetch(
          `/api/servers/${serverId}/files?path=${encodeURIComponent(p)}`,
        );
        const data = await res.json();
        if (res.ok) {
          if (data.isFile) {
            setViewFileContent({
              name: p.split("/").pop() || p,
              content: data.content,
            });
          } else {
            setFiles(data.files || []);
            setPath(p);
          }
        } else {
          setError(data.error || "Không thể đọc thư mục");
        }
      } catch {
        setError("Lỗi kết nối");
      }
      setLoading(false);
    },
    [serverId],
  );

  useEffect(() => {
    if (!serverId) return;
    const initialLoad = window.setTimeout(() => {
      void load("/");
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load, serverId]);

  const navigate = (name: string) => {
    const newPath = path === "/" ? `/${name}` : `${path}/${name}`;
    load(newPath);
  };

  const goUp = () => {
    if (path === "/") return;
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    load("/" + parts.join("/") || "/");
  };

  const breadcrumbs = ["/home/container", ...path.split("/").filter(Boolean)];
  const totalSize = files.reduce(
    (sum, f) => (f.isDirectory ? sum : sum + f.size),
    0,
  );

  const toggleSelect = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(name)) s.delete(name);
      else s.add(name);
      return s;
    });
  };

  const allSelectableNames = files.map((f) => f.name);
  const isAllSelected =
    allSelectableNames.length > 0 &&
    allSelectableNames.every((name) => selected.has(name));

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(allSelectableNames);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    try {
      const res = await fetch(`/api/servers/${serverId}/files`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await load(path);
      } else {
        const d = await res.json();
        setError(d.error || "Upload thất bại");
      }
    } catch {
      setError("Upload thất bại");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selected.size} mục đã chọn?`)) return;
    setLoading(true);
    setError("");
    const items = Array.from(selected);
    const errors: string[] = [];
    for (const item of items) {
      try {
        const itemPath = path === "/" ? `/${item}` : `${path}/${item}`;
        const res = await fetch(`/api/servers/${serverId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", filePath: itemPath }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errors.push(data.error || `Không thể xóa ${item}`);
        }
      } catch {
        errors.push(`Không thể xóa ${item}`);
      }
    }
    if (errors.length) {
      setError(errors.join("\n"));
    }
    setSelected(new Set());
    await load(path);
  };

  const handleCreateFile = async () => {
    const name = prompt("Nhập tên tệp mới (vd: index.js):");
    if (!name) return;
    const filePath = path === "/" ? `/${name}` : `${path}/${name}`;
    try {
      await fetch(`/api/servers/${serverId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_file", filePath, content: "" }),
      });
      await load(path);
    } catch {}
  };

  const handleCreateFolder = async () => {
    const name = prompt("Nhập tên thư mục mới:");
    if (!name) return;
    const filePath = path === "/" ? `/${name}` : `${path}/${name}`;
    try {
      await fetch(`/api/servers/${serverId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_folder", filePath }),
      });
      await load(path);
    } catch {}
  };

  return (
    <div className="relative flex flex-col gap-6 h-full">
      {viewFileContent && (
        <div className="absolute inset-3 z-50 flex h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-3xl border border-[#2b3345] bg-[#1e1e1e] shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-[#313131] bg-[#181818] px-4 py-2.5 pr-18">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b949e]">
              VS Code Preview
            </div>
            <div className="w-14" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2d2d] bg-[#252526] px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewFileContent(null)}
                className="flex items-center justify-center rounded-lg border border-[#3a3d41] bg-[#2a2d2e] p-2 text-[#cccccc] transition-colors hover:bg-[#37373d] hover:text-white"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-[12px] text-[#d4d4d4] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#519aba]" />
                <span className="font-medium">{viewFileContent.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#6a9955]">
                Language
                <span className="rounded border border-[#3a3d41] bg-[#1f1f1f] px-2 py-1 font-mono text-[#9cdcfe]">
                  {viewFileContent.name.split(".").pop() || "TXT"}
                </span>
              </div>
              <button
                onClick={async () => {
                  setUploading(true);
                  try {
                    const itemPath =
                      path === "/"
                        ? `/${viewFileContent.name}`
                        : `${path}/${viewFileContent.name}`;
                    const res = await fetch(`/api/servers/${serverId}/files`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "edit",
                        filePath: itemPath,
                        content: viewFileContent.content,
                      }),
                    });
                    if (res.ok) alert("Đã lưu file thành công!");
                    else alert("Lưu thất bại!");
                    await load(path);
                  } catch {
                    alert("Lỗi kết nối khi lưu!");
                  }
                  setUploading(false);
                }}
                disabled={uploading}
                className="rounded-md border border-[#0e639c] bg-[#0e639c] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1177bb] disabled:opacity-50"
              >
                {uploading ? "Đang lưu..." : "Save"}
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden bg-[#1e1e1e]">
            <div
              ref={lineNumberRef}
              className="hidden w-16 shrink-0 overflow-hidden border-r border-[#2d2d2d] bg-[#1b1b1b] px-3 py-5 text-right font-mono text-[12px] leading-[1.9] text-[#858585] md:block"
            >
              {editorLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div
                ref={highlightRef}
                className="pointer-events-none absolute inset-0 overflow-auto px-5 py-5 font-mono text-[13px] leading-[1.9] md:text-[14px]"
                style={{
                  tabSize: 2,
                  fontFamily:
                    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SFMono-Regular', monospace",
                }}
              >
                <pre className="m-0 min-h-full min-w-max whitespace-pre">
                  {viewFileContent.content
                    .split("\n")
                    .map((line, lineIndex) => (
                      <Fragment key={`${lineIndex}-${line}`}>
                        {highlightLine(line, editorLanguage).map(
                          (token, tokenIndex) => (
                            <span
                              key={`${lineIndex}-${tokenIndex}`}
                              className={token.className}
                            >
                              {token.text}
                            </span>
                          ),
                        )}
                        {lineIndex < editorLineCount - 1 ? "\n" : ""}
                      </Fragment>
                    ))}
                </pre>
              </div>
              <textarea
                ref={editorRef}
                value={viewFileContent.content}
                onChange={(e) =>
                  setViewFileContent({
                    ...viewFileContent,
                    content: e.target.value,
                  })
                }
                onScroll={syncEditorScroll}
                className="relative z-10 h-full w-full resize-none bg-transparent px-5 py-5 font-mono text-[13px] leading-[1.9] text-transparent caret-[#aeafad] focus:outline-none md:text-[14px]"
                style={{
                  tabSize: 2,
                  fontFamily:
                    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SFMono-Regular', monospace",
                }}
                wrap="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#2d2d2d] bg-[#007acc] px-4 py-1.5 text-[11px] font-medium text-white">
            <div className="flex items-center gap-4">
              <span>UTF-8</span>
              <span>LF</span>
              <span>
                {viewFileContent.name.split(".").pop()?.toUpperCase() || "TEXT"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Lines {editorLineCount}</span>
              <span>/home/container/{viewFileContent.name}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-[#0b111e] overflow-hidden flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-[#0c1426]">
          <div className="flex flex-wrap items-center gap-2">
            {breadcrumbs.map((seg, i) => (
              <div key={i} className="flex items-center">
                {i === 0 ? (
                  <button
                    onClick={() => load("/")}
                    className="bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 text-xs font-bold px-3 py-1.5 rounded-full transition"
                  >
                    {seg}
                  </button>
                ) : (
                  <>
                    <span className="text-gray-600 mx-1">/</span>
                    <button
                      onClick={() => {
                        const parts = path
                          .split("/")
                          .filter(Boolean)
                          .slice(0, i);
                        load("/" + parts.join("/"));
                      }}
                      className="text-xs font-bold text-gray-400 hover:text-white px-2 py-1.5 rounded-full hover:bg-white/5 transition-all"
                    >
                      {seg}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => load(path)}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold transition"
            >
              Refresh
            </button>
            <button
              onClick={handleCreateFile}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold transition"
            >
              Tạo file
            </button>
            <button
              onClick={handleCreateFolder}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold transition"
            >
              Tạo thư mục
            </button>
            <button
              onClick={handleDelete}
              disabled={selected.size === 0}
              className="px-3.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition disabled:opacity-50"
            >
              Xóa ({selected.size})
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.24em] text-gray-500 font-black">
            File listing
          </span>
          <span className="text-[11px] font-mono text-gray-400">
            Total: {formatSize(totalSize)}
          </span>
        </div>

        <table className="w-full text-left">
          <thead className="bg-[#0a101e] border-b border-white/10">
            <tr className="text-[10px] uppercase tracking-[0.24em] text-gray-500 font-black">
              <th className="py-3 pl-6 w-12">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded-md border border-white/25 bg-[#0a101e] text-cyan-300 accent-cyan-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  />
                </div>
              </th>
              <th className="py-3 pl-1 font-black">Name</th>
              <th className="py-3 text-right pr-6 w-28">Size</th>
              <th className="py-3 text-right pr-6 w-44">Modified</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {path !== "/" && (
              <tr
                onClick={goUp}
                className="border-b border-white/5 hover:bg-white/3 cursor-pointer select-none"
              >
                <td className="py-3 pl-6"></td>
                <td className="py-3 flex items-center gap-3 text-gray-400 font-semibold">
                  <span className="text-gray-600">..</span>
                </td>
                <td></td>
                <td></td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="py-12 text-center text-gray-600 text-sm"
                >
                  Loading...
                </td>
              </tr>
            )}
            {!loading && files.length === 0 && (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <p className="text-gray-600 text-sm">Thư mục trống</p>
                </td>
              </tr>
            )}
            {!loading &&
              files.map((f) => (
                <tr
                  key={f.name}
                  onClick={() => navigate(f.name)}
                  className={`border-b border-white/5 hover:bg-white/3 cursor-pointer select-none transition-colors ${
                    selected.has(f.name) ? "bg-cyan-500/5" : ""
                  }`}
                >
                  <td
                    className="py-3 pl-6"
                    onClick={(e) => toggleSelect(f.name, e)}
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        readOnly
                        checked={selected.has(f.name)}
                        className="h-4 w-4 rounded-md border border-white/25 bg-[#0a101e] text-cyan-300 accent-cyan-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4 pl-1">
                    <div className="flex items-center gap-3 text-gray-200 font-medium">
                      {f.isDirectory ? (
                        <svg
                          className="h-4 w-4 text-emerald-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4 text-slate-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      )}
                      <span className="truncate">{f.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-6 text-gray-200 text-[12px] font-mono">
                    {f.isDirectory ? "—" : formatSize(f.size)}
                  </td>
                  <td className="py-3 text-right pr-6 text-gray-400 text-[12px]">
                    {new Date(f.lastModified).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {new Date(f.lastModified).toLocaleDateString("vi-VN")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
