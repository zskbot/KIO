export type AgentSkill = "frontend" | "backend" | "debugging" | "testing" | "git-workflow" | "deployment" | "documentation" | "project-analysis";

const SKILLS: Record<AgentSkill, string[]> = {
  frontend: ["html","css","javascript","react","ui","ux","giao diện","component","style","layout","responsive","frontend","next.js"],
  backend: ["api","server","backend","database","sql","endpoint","route","flask","django","fastapi","python","node","authentication","xác thực","schema"],
  debugging: ["lỗi","bug","error","exception","crash","sửa lỗi","traceback","fix","debug","không chạy"],
  testing: ["test","kiểm thử","unittest","pytest","coverage","assert","qa","kiểm tra","vitest","jest"],
  "git-workflow": ["git","commit","branch","merge","pull request","pr","rebase","checkout","clone","github"],
  deployment: ["deploy","triển khai","ci/cd","pipeline","docker","release","production","host","domain","preview"],
  documentation: ["readme","docs","document","guide","explain","tài liệu","hướng dẫn"],
  "project-analysis": ["phân tích","tổng quan","cấu trúc","overview","structure","workspace","project","architecture","kiến trúc"]
};

export function routePrompt(prompt: string): AgentSkill[] {
  const text = prompt.toLowerCase();
  const scores = (Object.entries(SKILLS) as [AgentSkill, string[]][])
    .map(([skill, keywords]) => ({ skill, score: keywords.reduce((n, keyword) => n + (text.includes(keyword) ? 1 : 0), 0) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scores.length) return ["project-analysis"];
  return scores.slice(0, 4).map(item => item.skill);
}

// Skill routing is descriptive only. It never executes shell commands or mutates a repository.
