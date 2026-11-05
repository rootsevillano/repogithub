import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";

type Props = { value: string; onChange: (html: string) => void; placeholder?: string };

function Btn({ on, title, onClick, children, disabled }: { on?: boolean; title: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`rt-btn ${on ? "on" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // no perder la selección
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="rt-sep" aria-hidden />;

const COLORS = ["#1f2937", "#2f5bea", "#0f8a6a", "#b5651d", "#c6372f", "#8a3fd1"];

function Toolbar({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const block = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : editor.isActive("codeBlock") ? "code" : "p";

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace (vacío para quitarlo)", prev ?? "https://");
    if (url === null) return;
    if (!url || url === "https://") c().extendMarkRange("link").unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rt-toolbar" role="toolbar" aria-label="Formato de texto">
      <Btn title="Deshacer (Ctrl+Z)" onClick={() => c().undo().run()} disabled={!editor.can().undo()}>↶</Btn>
      <Btn title="Rehacer (Ctrl+Y)" onClick={() => c().redo().run()} disabled={!editor.can().redo()}>↷</Btn>
      <Sep />
      <select
        className="rt-select"
        value={block}
        aria-label="Estilo de párrafo"
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") c().setParagraph().run();
          else if (v === "code") c().toggleCodeBlock().run();
          else c().setHeading({ level: v === "h2" ? 2 : 3 }).run();
        }}
      >
        <option value="p">Párrafo</option>
        <option value="h2">Título</option>
        <option value="h3">Subtítulo</option>
        <option value="code">Código</option>
      </select>
      <Sep />
      <Btn title="Negrita (Ctrl+B)" on={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><b>B</b></Btn>
      <Btn title="Cursiva (Ctrl+I)" on={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><i>I</i></Btn>
      <Btn title="Subrayado (Ctrl+U)" on={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><u>U</u></Btn>
      <Btn title="Tachado" on={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><s>S</s></Btn>
      <Btn title="Código en línea" on={editor.isActive("code")} onClick={() => c().toggleCode().run()}>{"</>"}</Btn>
      <Btn title="Resaltar" on={editor.isActive("highlight")} onClick={() => c().toggleHighlight().run()}><mark className="rt-mark">A</mark></Btn>
      <span className="rt-colors" role="group" aria-label="Color de texto">
        {COLORS.map((col) => (
          <button
            key={col}
            type="button"
            className={`rt-swatch ${editor.isActive("textStyle", { color: col }) ? "on" : ""}`}
            style={{ background: col }}
            title={`Color ${col}`}
            aria-label={`Color de texto ${col}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => c().setColor(col).run()}
          />
        ))}
        <Btn title="Quitar color" onClick={() => c().unsetColor().run()}>⦸</Btn>
      </span>
      <Sep />
      <Btn title="Alinear a la izquierda" on={editor.isActive({ textAlign: "left" })} onClick={() => c().setTextAlign("left").run()}>
        <AlignIcon kind="left" />
      </Btn>
      <Btn title="Centrar" on={editor.isActive({ textAlign: "center" })} onClick={() => c().setTextAlign("center").run()}>
        <AlignIcon kind="center" />
      </Btn>
      <Btn title="Alinear a la derecha" on={editor.isActive({ textAlign: "right" })} onClick={() => c().setTextAlign("right").run()}>
        <AlignIcon kind="right" />
      </Btn>
      <Btn title="Justificar" on={editor.isActive({ textAlign: "justify" })} onClick={() => c().setTextAlign("justify").run()}>
        <AlignIcon kind="justify" />
      </Btn>
      <Sep />
      <Btn title="Lista con viñetas" on={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>•≡</Btn>
      <Btn title="Lista numerada" on={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>1≡</Btn>
      <Btn title="Cita" on={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}>❝</Btn>
      <Btn title="Línea separadora" onClick={() => c().setHorizontalRule().run()}>―</Btn>
      <Sep />
      <Btn title="Insertar / editar enlace" on={editor.isActive("link")} onClick={setLink}>🔗</Btn>
      <Btn title="Quitar formato" onClick={() => c().unsetAllMarks().clearNodes().unsetTextAlign().run()}>⌫</Btn>
    </div>
  );
}

function AlignIcon({ kind }: { kind: "left" | "center" | "right" | "justify" }) {
  const rows: [number, number][] =
    kind === "justify" ? [[2, 14], [2, 14], [2, 14], [2, 14]]
    : kind === "left" ? [[2, 14], [2, 10], [2, 14], [2, 8]]
    : kind === "right" ? [[2, 14], [6, 14], [2, 14], [8, 14]]
    : [[2, 14], [4, 12], [2, 14], [5, 11]];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      {rows.map(([a, b], i) => (
        <line key={i} x1={a} x2={b} y1={3 + i * 3.4} y2={3 + i * 3.4} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export default function RichEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Escribe el contenido…" }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Si el valor cambia desde fuera (p. ej. al cargar otra entrada), sincronizar.
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) editor.commands.setContent(value, false);
  }, [value, editor]);

  if (!editor) return null;
  return (
    <div className="rt">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rt-content prose" />
    </div>
  );
}
