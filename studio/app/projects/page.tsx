"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FilePlus2, FolderKanban, Package, Plus, RefreshCw } from "lucide-react";

type Project = { id: string; name: string; slug: string; description: string; _count: { files: number; artifacts: number } };
type Artifact = { id: string; filename: string; size: number; checksum: string; downloadUrl: string };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [path, setPath] = useState("README.md");
  const [content, setContent] = useState("# My KIO project\n\nCreated with KIO.AI Studio.\n");
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load projects.");
    setProjects(data.projects);
    if (!selected && data.projects[0]) setSelected(data.projects[0].id);
  }
  useEffect(() => { loadProjects().catch((error) => setNotice(error.message)); }, []);

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

  async function saveFile(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects/" + selected + "/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save file.");
      await loadProjects(); setNotice("Saved " + data.file.path + ".");
    } catch (error) { setNotice(error instanceof Error ? error.message : "File save failed."); }
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
      <div className="page-heading"><div><div className="eyebrow">KIO PLATFORM / FULL-PACKER</div><h1>Projects <span>& packages.</span></h1><p>Create projects, manage source files and produce downloadable ZIP artifacts.</p></div><button className="button button-outline" onClick={() => loadProjects().catch(e => setNotice(e.message))}><RefreshCw size={14}/>Refresh</button></div>
      <div className="content-grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(260px,.8fr)" }}>
        <section className="copilot-card" style={{ minHeight: 0, padding: 20 }}>
          <div className="card-title"><FolderKanban size={18}/><div><b>Project workspace</b><small>Private to your account</small></div></div>
          <form onSubmit={createProject} style={{ display: "flex", gap: 8, margin: "20px 0" }}>
            <input aria-label="Project name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="New project name" style={{ flex: 1, minWidth: 0, padding: 11, background: "#090c10", border: "1px solid var(--line)", color: "var(--text)" }}/>
            <button className="button button-light" disabled={busy}><Plus size={14}/>Create</button>
          </form>
          <label htmlFor="project-select" className="eyebrow">SELECT PROJECT</label>
          <select id="project-select" value={selected} onChange={e => { setSelected(e.target.value); setArtifact(null); }} style={{ display: "block", width: "100%", margin: "8px 0 20px", padding: 11, background: "#090c10", border: "1px solid var(--line)", color: "var(--text)" }}>
            <option value="">Choose a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project._count.files} files</option>)}
          </select>
          {activeProject ? <div className="metric-card"><strong>{activeProject.name}</strong><small>/{activeProject.slug} · {activeProject._count.files} source files · {activeProject._count.artifacts} packages</small></div> : <p style={{ color: "var(--muted)" }}>Create a project to begin.</p>}
          <form onSubmit={saveFile} style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <div className="card-title"><FilePlus2 size={16}/><b>Add or update a text file</b></div>
            <input aria-label="File path" value={path} onChange={e => setPath(e.target.value)} placeholder="src/index.js" required maxLength={240} style={{ padding: 11, background: "#090c10", border: "1px solid var(--line)", color: "var(--text)" }}/>
            <textarea aria-label="File contents" value={content} onChange={e => setContent(e.target.value)} rows={10} style={{ padding: 12, resize: "vertical", background: "#090c10", border: "1px solid var(--line)", color: "var(--text)", fontFamily: "monospace", lineHeight: 1.6 }}/>
            <button className="button button-outline" disabled={busy || !selected}>Save file</button>
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
