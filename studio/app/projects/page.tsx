"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Eye, FilePlus2, FileText, FolderKanban, Package, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type Project = { id: string; name: string; slug: string; description: string; _count: { files: number; artifacts: number } };
type ProjectFile = { id: string; path: string; size: number; updatedAt: string };
type Artifact = { id: string; filename: string; size: number; checksum: string; downloadUrl: string };
type EditorTab = { key: string; path: string; originalPath: string; content: string; dirty: boolean; saveState: "idle" | "saving" | "saved" | "error"; isNew: boolean };

const fieldStyle = {
  padding: 11,
  background: "#090c10",
  border: "1px solid var(--line)",
  color: "var(--text)",
  minWidth: 0,
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState("");
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [artifact, setArtifact]  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function loadProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load projects.");
    setProjects(data.projects);
    if (!selected && data.projects[0]) setSelected(data.projects[0].id);
  }

  async function loadFiles(projectId: string) {
    setLoadingFiles(true);
    try {
      const response = await fetch("/api/projects/" + projectId + "/files", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load project files.");
      setFiles(data.files);
      setTabs((current) => current.filter((tab) => tab.isNew || data.files.some((file: ProjectFile) => file.path === tab.path)));
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => { loadProjects().catch((error) => setNotice(error.message)); }, []);
  useEffect(() => {
    const project = projects.find((item) => item.id === selected);
    setProjectName(project?.name ?? "");
    setProjectDescription(project?.description ?? "");
  }, [selected, projects]);
  useEffect(() => {
    if (!selected) { setFiles([]); setTabs([]); setActiveTabKey(""); return; }
    loadFiles(selected).catch((error) => setNotice(error.message));
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const controllers: AbortController[] = [];
    const timers = tabs.filter((tab) => !tab.isNew && tab.dirty && tab.path && tab.path === tab.originalPath).map((tab) => {
      const controller = new AbortController();
      controllers.push(controller);
      return window.setTimeout(async () => {
        try {
          const response = await fetch("/api/projects/" + selected + "/files", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: tab.path, content: tab.content }), signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Autosave failed.");
          setTabs((current) => current.map((item) => item.key === tab.key ? { ...item, dirty: false, saveState: "saved" } : item));
          setFiles((current) => current.map((file) => file.path === tab.path ? { ...file, size: data.file.size, updatedAt: data.file.updatedAt } : file));
        } catch (error) {
          if (!controller.signal.aborted) {
            setTabs((current) => current.map((item) => item.key === tab.key ? { ...item, dirty: false, saveState: "error" } : item));
            setNotice(error instanceof Error ? error.message : "Autosave failed.");
          }
        }
      }, 1200);
    });
    return () => { timers.forEach(window.clearTimeout); controllers.forEach((controller) => controller.abort()); };
  }, [selected, tabs]);

  async function openFile(filePath: string) {
    if (!selected) return;
    const existing = tabs.find((tab) => tab.path === filePath && !tab.isNew);
    if (existing) { setActiveTabKey(existing.key); return; }
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files?path=" + encodeURIComponent(filePath), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open file.");
      const tab: EditorTab = { key: data.file.path, path: data.file.path, originalPath: data.file.path, content: data.file.content, dirty: false, saveState: "saved", isNew: false };
      setTabs((current) => [...current, tab]);
      setActiveTabKey(tab.key);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not open file."); }
    finally { setBusy(false); }
  }

  async function createProject(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create project.");
      setName(""); setSelected(data.project.id); await loadProjects(); setNotice("Project created.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Project creation failed."); }
    finally { setBusy(false); }
  }

  function changeProject(projectId: string) {
    if (tabs.some((tab) => tab.dirty) && !window.confirm("Switch projects and discard unsaved editor changes?")) return;
    setSelected(projectId);
    setArtifact(null);
    setTabs([]);
    setActiveTabKey("");
  }

  async function saveProjectSettings(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, description: projectDescription }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update project.");
      setProjects((current) => current.map((project) => project.id === selected
        ? { ...project, name: data.project.name, description: data.project.description }
        : project));
      setNotice("Project settings saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Project settings update failed.");
    } finally {
      setBusy(false);
    }
  }

  function newFile() {
    const draft = tabs.find((tab) => tab.isNew);
    if (draft) { setActiveTabKey(draft.key); return; }
    const tab: EditorTab = { key: "new-file-" + Date.now(), path: "", originalPath: "", content: "", dirty: false, saveState: "idle", isNew: true };
    setTabs((current) => [...current, tab]); setActiveTabKey(tab.key);
    setNotice("New file: enter a path and save.");
  }

  function updateActiveTab(patch: Partial<EditorTab>) {
    setTabs((current) => current.map((tab) => tab.key === activeTabKey ? { ...tab, ...patch } : tab));
  }

  function closeTab(tab: EditorTab) {
    if (tab.dirty && !window.confirm("Close " + (tab.path || "new file") + " and discard unsaved changes?")) return;
    const next = tabs.find((item) => item.key !== tab.key);
    setTabs((current) => current.filter((item) => item.key !== tab.key));
    if (activeTabKey === tab.key) setActiveTabKey(next?.key ?? "");
  }

  async function saveFile(event: FormEvent) {
    event.preventDefault();
    if (!selected || !activeTab?.path.trim()) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save file.");
      const saved: EditorTab = { ...activeTab, key: data.file.path, path: data.file.path, originalPath: data.file.path, dirty: false, saveState: "saved", isNew: false };
      setTabs((current) => current.map((tab) => tab.key === activeTab.key ? saved : tab));
      setActiveTabKey(saved.key);
      await Promise.all([loadProjects(), loadFiles(selected)]);
      setNotice("Saved " + data.file.path + ".");
    } catch (error) { setNotice(error instanceof Error ? error.message : "File save failed."); }
    finally { setBusy(false); }
  }

  async function renameFile() {
    if (!selected || !activeTab || activeTab.isNew || !activeTab.originalPath || !activeTab.path.trim()) return;
    const nextPath = activeTab.path.trim();
    if (nextPath === activeTab.originalPath) return;
    if (tabs.some((tab) => tab.key !== activeTab.key && tab.path === nextPath)) {
      setNotice("A tab is already open for that destination path.");
      return;
    }
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath: activeTab.originalPath, toPath: nextPath }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not rename file.");
      const renamed = { ...activeTab, key: data.file.path, path: data.file.path, originalPath: data.file.path, dirty: activeTab.dirty, saveState: activeTab.dirty ? "idle" as const : "saved" as const };
      setTabs((current) => current.map((tab) => tab.key === activeTab.key ? renamed : tab));
      setActiveTabKey(renamed.key);
      await loadFiles(selected);
      setNotice("Renamed to " + data.file.path + ".");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "File rename failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFile() {
    if (!selected || !activeTab?.path || activeTab.isNew) return;
    if (!window.confirm("Delete " + activeTab.path + "? This cannot be undone.")) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files?path=" + encodeURIComponent(activeTab.path), { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete file.");
      setTabs((current) => current.filter((tab) => tab.key !== activeTab.key)); setActiveTabKey("");
      await Promise.all([loadProjects(), loadFiles(selected)]);
      setNotice("Deleted " + data.path + ".");
    } catch (error) { setNotice(error instanceof Error ? error.message : "File deletion failed."); }
    finally { setBusy(false); }
  }

  async function openPreview() {
    if (!selected) return;
    setPreviewLoading(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/preview", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start project preview.");
      setPreviewHtml(data.html);
      setPreviewOpen(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function packProject() {
    if (!selected) return;
    setBusy(true); setNotice(""); setArtifact(null);
    try {
      const response = await fetch("/api/projects/" + selected + "/pack", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Packaging failed.");
      setArtifact(data.artifact); await loadProjects(); setNotice("Package created. SHA-256: " + data.artifact.checksum);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Packaging failed."); }
    finally { setBusy(false); }
  }

  const activeProject = projects.find((project) => project.id === selected);
  const activeTab = tabs.find((tab) => tab.key === activeTabKey);
  return <main className="shell" style={{ minHeight: "100vh" }}>
    {previewOpen ? <div role="dialog" aria-modal="true" aria-label="Isolated project preview" className="kio-preview-overlay">
      <div className="kio-preview-window">
        <div className="kio-preview-header"><div><b>Isolated Preview Runtime</b><small>Project HTML · sandboxed iframe · network access blocked</small></div><button type="button" className="button button-outline" onClick={() => setPreviewOpen(false)}>Close</button></div>
        <iframe title="Project preview" sandbox="allow-scripts" srcDoc={previewHtml} referrerPolicy="no-referrer" className="kio-preview-frame"/>
      </div>
    </div> : null}
    <header className="topbar"><Link href="/" className="brand"><span className="brand-symbol"><i/><i/></span><span>KIO<span className="brand-dot">.AI</span></span></Link><div className="crumb"><span>Workspace</span><span className="slash">/</span><strong>Projects & Full-packer</strong></div><div className="top-actions"><Link href="/" className="button button-outline"><ArrowLeft size={14}/>Workspace</Link></div></header>
    <section className="main-panel" style={{ maxWidth: 1120 }}>
      <div className="page-heading"><div><div className="eyebrow">KIO PLATFORM / FULL-PACKER</div><h1>Projects <span>& packages.</span></h1><p>Create projects, browse source files, edit text and produce downloadable ZIP artifacts.</p></div><button className="button button-outline" onClick={() => { loadProjects().then(() => selected && loadFiles(selected)).catch(e => setNotice(e.message)); }}><RefreshCw size={14}/>Refresh</button></div>
      <div className="content-grid kio-project-grid" style={{ alignItems: "start" }}>
        <section className="copilot-card" style={{ minHeight: 0, padding: 20 }}>
          <div className="card-title"><FolderKanban size={18}/><div><b>Project workspace</b><small>Private to your account</small></div></div>
          <form onSubmit={createProject} style={{ display: "flex", gap: 8, margin: "20px 0" }}>
            <input aria-label="Project name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="New project name" style={{ ...fieldStyle, flex: 1 }}/>
            <button className="button button-light" disabled={busy}><Plus size={14}/>Create</button>
          </form>
          <label htmlFor="project-select" className="eyebrow">SELECT PROJECT</label>
          <select id="project-select" value={selected} onChange={e => changeProject(e.target.value)} style={{ ...fieldStyle, display: "block", width: "100%", margin: "8px 0 20px" }}>
            <option value="">Choose a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project._count.files} files</option>)}
          </select>
          {activeProject ? <>
            <div className="metric-card"><strong>{activeProject.name}</strong><small>/{activeProject.slug} · {activeProject._count.files} source files · {activeProject._count.artifacts} packages</small></div>
            <form onSubmit={saveProjectSettings} style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <div className="eyebrow">PROJECT SETTINGS</div>
              <input aria-label="Project name" required maxLength={80} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Project name" style={fieldStyle}/>
              <textarea aria-label="Project description" maxLength={2000} rows={3} value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="Describe this project" style={{ ...fieldStyle, resize: "vertical" }}/>
              <button className="button button-outline" disabled={busy || !projectName.trim()}><Save size={14}/>Save project settings</button>
            </form>
          </> : <p style={{ color: "var(--muted)" }}>Create a project to begin.</p>}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 22 }}>
            <div className="card-title"><FileText size={16}/><b>Source files</b></div>
            <div className="kio-file-actions"><button type="button" className="button button-outline" onClick={openPreview} disabled={!selected || previewLoading}><Eye size={14}/>{previewLoading ? "Loading…" : "Preview"}</button><button type="button" className="button button-outline" onClick={newFile} disabled={!selected || busy}><FilePlus2 size={14}/>New file</button></div>
          </div>
          <div style={{ border: "1px solid var(--line)", marginTop: 10, maxHeight: 210, overflowY: "auto" }}>
            {loadingFiles ? <p style={{ padding: 12, color: "var(--muted)" }}>Loading files…</p> : files.length ? files.map(file => <button key={file.id} type="button" onClick={() => openFile(file.path)} disabled={busy} style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 12, textAlign: "left", padding: "10px 12px", border: 0, borderBottom: "1px solid var(--line)", background: tabs.some((tab) => tab.path === file.path) ? "#151b24" : "transparent", color: "var(--text)", cursor: "pointer" }}><span style={{ overflowWrap: "anywhere" }}>{file.path}</span><small style={{ color: "var(--muted)", flexShrink: 0 }}>{(file.size / 1024).toFixed(1)} KB</small></button>) : <p style={{ padding: 12, color: "var(--muted)" }}>No files yet. Create your first source file below.</p>}
          </div>

          <div className="kio-source-tabs" role="tablist" aria-label="Open source files" style={{ display: "flex", gap: 4, overflowX: "auto", marginTop: 16, borderBottom: "1px solid var(--line)" }}>
            {tabs.map((tab) => <div key={tab.key} style={{ display: "flex", alignItems: "center", border: "1px solid var(--line)", borderBottom: activeTabKey === tab.key ? "2px solid var(--cyan)" : "1px solid var(--line)", background: activeTabKey === tab.key ? "#151b24" : "transparent" }}>
              <button type="button" role="tab" aria-selected={activeTabKey === tab.key} onClick={() => setActiveTabKey(tab.key)} style={{ padding: "8px 10px", border: 0, background: "transparent", color: "var(--text)", whiteSpace: "nowrap" }}>{tab.path || "Untitled"}{tab.dirty ? " •" : ""}</button>
              <button type="button" aria-label={"Close " + (tab.path || "new file")} onClick={() => closeTab(tab)} style={{ border: 0, background: "transparent", color: "var(--muted)", padding: "6px 8px" }}>×</button>
            </div>)}
          </div>
          <form onSubmit={saveFile} style={{ marginTop: 18, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div className="card-title"><FilePlus2 size={16}/><b>{activeTab?.isNew || !activeTab?.path ? "Create source file" : "Edit source file"}</b><small>{activeTab?.saveState === "saving" ? "Autosaving…" : activeTab?.saveState === "saved" && !activeTab?.dirty ? "Saved" : activeTab?.saveState === "error" ? "Autosave failed" : activeTab?.dirty && activeTab.path !== activeTab.originalPath ? "Path changed · manual save required" : activeTab?.dirty ? "Unsaved changes" : ""}</small></div>
              {activeTab?.path && !activeTab.isNew ? <div className="kio-file-actions">
                  {activeTab.path !== activeTab.originalPath ? <button type="button" className="button button-outline" onClick={renameFile} disabled={busy}><Save size={13}/>Rename file</button> : null}
                  <button type="button" className="button button-outline" onClick={deleteFile} disabled={busy} style={{ color: "#ff8585" }}><Trash2 size={13}/>Delete</button>
                </div> : null}
            </div>
            <input aria-label="File path" value={activeTab?.path ?? ""} onChange={e => updateActiveTab({ path: e.target.value, dirty: true, saveState: "idle" })} placeholder="src/index.js" required maxLength={240} style={fieldStyle} disabled={!activeTab}/>
            <textarea className="kio-source-editor" aria-label="File contents" value={activeTab?.content ?? ""} onChange={e => updateActiveTab({ content: e.target.value, dirty: true, saveState: "idle" })} rows={12} style={{ ...fieldStyle, resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }} disabled={!activeTab}/>
            <button className="button button-light" disabled={busy || !selected || !activeTab || !activeTab.path.trim()}><Save size={14}/>{busy ? "Working…" : "Save file"}</button>
          </form>
        </section>

        <section className="copilot-card" style={{ minHeight: 0, padding: 20 }}>
          <div className="card-title"><Package size={18}/><div><b>Full-packer</b><small>ZIP · manifest · SHA-256</small></div></div>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Package the project source into a ZIP archive. The packer adds a KIO manifest and stores a private artifact in the database.</p>
          <div className="metric-card" style={{ margin: "18px 0" }}><strong>200 files max</strong><small>10 MiB total source · text files only · no build scripts executed</small></div>
          <button className="button button-light" style={{ width: "100%" }} onClick={packProject} disabled={busy || !selected}><Package size={15}/>{busy ? "Working…" : "Build package"}</button>
          {artifact ? <div className="metric-card" style={{ marginTop: 16 }}>
            <strong>{artifact.filename}</strong><small>{(artifact.size / 1024).toFixed(1)} KiB · SHA-256</small>
            <code style={{ display: "block", overflowWrap: "anywhere", margin: "10px 0", color: "var(--cyan)", fontSize: 10 }}>{artifact.checksum}</code>
            <a className="button button-outline" href={artifact.downloadUrl}><Download size={14}/>Download ZIP</a>
          </div> : null}
          {notice ? <p role="status" style={{ marginTop: 18, color: "var(--cyan)", overflowWrap: "anywhere" }}>{notice}</p> : null}
        </section>
      </div>
    </section>
  </main>;
}
