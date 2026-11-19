"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FilePlus2, FileText, FolderKanban, Package, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type Project = { id: string; name: string; slug: string; description: string; _count: { files: number; artifacts: number } };
type ProjectFile = { id: string; path: string; size: number; updatedAt: string };
type Artifact = { id: string; filename: string; size: number; checksum: string; downloadUrl: string };

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
  const [activePath, setActivePath] = useState("");
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [path, setPath] = useState("README.md");
  const [content, setContent] = useState("# My KIO project\n\nCreated with KIO.AI Studio.\n");
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
      if (activePath && !data.files.some((file: ProjectFile) => file.path === activePath)) {
        setActivePath("");
        setPath("");
        setContent("");
      }
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
    if (!selected) { setFiles([]); setActivePath(""); return; }
    loadFiles(selected).catch((error) => setNotice(error.message));
  }, [selected]);

  useEffect(() => {
    if (!selected || !activePath || path !== activePath || !isDirty) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch("/api/projects/" + selected + "/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Autosave failed.");
        setIsDirty(false);
        setSaveState("saved");
        setFiles((current) => current.map((file) => file.path === path
          ? { ...file, size: data.file.size, updatedAt: data.file.updatedAt }
          : file));
      } catch (error) {
        if (!controller.signal.aborted) {
          setSaveState("error");
          setNotice(error instanceof Error ? error.message : "Autosave failed.");
        }
      }
    }, 1200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [selected, activePath, path, content, isDirty]);

  async function openFile(filePath: string) {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files?path=" + encodeURIComponent(filePath), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open file.");
      setActivePath(data.file.path);
      setPath(data.file.path);
      setContent(data.file.content);
      setIsDirty(false);
      setSaveState("saved");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open file.");
    } finally {
      setBusy(false);
    }
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
    setActivePath("");
    setPath("");
    setContent("");
    setIsDirty(false);
    setSaveState("idle");
    setNotice("New file: enter a path and save.");
  }

  async function saveFile(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save file.");
      setActivePath(data.file.path);
      setPath(data.file.path);
      setIsDirty(false);
      setSaveState("saved");
      await Promise.all([loadProjects(), loadFiles(selected)]);
      setNotice("Saved " + data.file.path + ".");
    } catch (error) { setNotice(error instanceof Error ? error.message : "File save failed."); }
    finally { setBusy(false); }
  }

  async function deleteFile() {
    if (!selected || !activePath) return;
    if (!window.confirm("Delete " + activePath + "? This cannot be undone.")) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files?path=" + encodeURIComponent(activePath), { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete file.");
      setActivePath(""); setPath(""); setContent(""); setIsDirty(false); setSaveState("idle");
      await Promise.all([loadProjects(), loadFiles(selected)]);
      setNotice("Deleted " + data.path + ".");
    } catch (error) { setNotice(error instanceof Error ? error.message : "File deletion failed."); }
    finally { setBusy(false); }
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
  return <main className="shell" style={{ minHeight: "100vh" }}>
    <header className="topbar"><Link href="/" className="brand"><span className="brand-symbol"><i/><i/></span><span>KIO<span className="brand-dot">.AI</span></span></Link><div className="crumb"><span>Workspace</span><span className="slash">/</span><strong>Projects & Full-packer</strong></div><div className="top-actions"><Link href="/" className="button button-outline"><ArrowLeft size={14}/>Workspace</Link></div></header>
    <section className="main-panel" style={{ maxWidth: 1120 }}>
      <div className="page-heading"><div><div className="eyebrow">KIO PLATFORM / FULL-PACKER</div><h1>Projects <span>& packages.</span></h1><p>Create projects, browse source files, edit text and produce downloadable ZIP artifacts.</p></div><button className="button button-outline" onClick={() => { loadProjects().then(() => selected && loadFiles(selected)).catch(e => setNotice(e.message)); }}><RefreshCw size={14}/>Refresh</button></div>
      <div className="content-grid" style={{ gridTemplateColumns: "minmax(0,1.25fr) minmax(260px,.75fr)", alignItems: "start" }}>
        <section className="copilot-card" style={{ minHeight: 0, padding: 20 }}>
          <div className="card-title"><FolderKanban size={18}/><div><b>Project workspace</b><small>Private to your account</small></div></div>
          <form onSubmit={createProject} style={{ display: "flex", gap: 8, margin: "20px 0" }}>
            <input aria-label="Project name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="New project name" style={{ ...fieldStyle, flex: 1 }}/>
            <button className="button button-light" disabled={busy}><Plus size={14}/>Create</button>
          </form>
          <label htmlFor="project-select" className="eyebrow">SELECT PROJECT</label>
          <select id="project-select" value={selected} onChange={e => { setSelected(e.target.value); setArtifact(null); }} style={{ ...fieldStyle, display: "block", width: "100%", margin: "8px 0 20px" }}>
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
            <button type="button" className="button button-outline" onClick={newFile} disabled={!selected || busy}><FilePlus2 size={14}/>New file</button>
          </div>
          <div style={{ border: "1px solid var(--line)", marginTop: 10, maxHeight: 210, overflowY: "auto" }}>
            {loadingFiles ? <p style={{ padding: 12, color: "var(--muted)" }}>Loading files…</p> : files.length ? files.map(file => <button key={file.id} type="button" onClick={() => openFile(file.path)} disabled={busy} style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 12, textAlign: "left", padding: "10px 12px", border: 0, borderBottom: "1px solid var(--line)", background: activePath === file.path ? "#151b24" : "transparent", color: "var(--text)", cursor: "pointer" }}><span style={{ overflowWrap: "anywhere" }}>{file.path}</span><small style={{ color: "var(--muted)", flexShrink: 0 }}>{(file.size / 1024).toFixed(1)} KB</small></button>) : <p style={{ padding: 12, color: "var(--muted)" }}>No files yet. Create your first source file below.</p>}
          </div>

          <form onSubmit={saveFile} style={{ marginTop: 18, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div className="card-title"><FilePlus2 size={16}/><b>{activePath ? "Edit source file" : "Create source file"}</b><small>{saveState === "saving" ? "Autosaving…" : saveState === "saved" && !isDirty ? "Saved" : saveState === "error" ? "Autosave failed" : isDirty ? "Unsaved changes" : ""}</small></div>
              {activePath ? <button type="button" className="button button-outline" onClick={deleteFile} disabled={busy} style={{ color: "#ff8585" }}><Trash2 size={13}/>Delete</button> : null}
            </div>
            <input aria-label="File path" value={path} onChange={e => setPath(e.target.value)} placeholder="src/index.js" required maxLength={240} style={fieldStyle}/>
            <textarea aria-label="File contents" value={content} onChange={e => { setContent(e.target.value); setIsDirty(true); setSaveState("idle"); }} rows={12} style={{ ...fieldStyle, resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }}/>
            <button className="button button-light" disabled={busy || !selected || !path.trim()}><Save size={14}/>{busy ? "Working…" : "Save file"}</button>
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
