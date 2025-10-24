import { proxyFetch } from "@/lib/proxyClient";
import { supa } from "@/lib/supabaseClient";

export async function createProject(name: string, description: string) {
  // 1) zjisti uživatele
  const { data: { user } } = await supa.auth.getUser();
  if (!user) throw new Error("Nejsi přihlášený");

  // 2) vlož projekt
  const projects = await proxyFetch<{ id: string }[]>({
    action: "insert",
    table: "projects",
    payload: {
      name,
      description,
      owner_id: user.id,
    },
  });

  const projectId = projects?.[0]?.id;
  if (!projectId) throw new Error("Projekt se nepodařilo vytvořit");

  // 3) přidej zakladatele jako člena
  await proxyFetch({
    action: "insert",
    table: "project_members",
    payload: {
      project_id: projectId,
      user_id: user.id,
      role: "owner",
    },
  });

  // 4) volitelně seed základních kanálů / poznámky
  await proxyFetch({
    action: "insert",
    table: "chat_channels",
    payload: [
      { project_id: projectId, name: "general", created_by: user.id },
      { project_id: projectId, name: "announcements", created_by: user.id },
    ],
  });

  await proxyFetch({
    action: "insert",
    table: "notes",
    payload: {
      project_id: projectId,
      author_id: user.id,
      title: "Project Kickoff",
      content: "### První poznámka\nNapiš si cíle a první kroky…",
    },
  });

  return projectId;
}
