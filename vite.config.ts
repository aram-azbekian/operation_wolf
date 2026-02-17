import { defineConfig } from "vite";

const githubRepository = process.env.GITHUB_REPOSITORY ?? "";
const repositoryName = githubRepository.split("/")[1] ?? "";
const githubPagesBase =
  repositoryName && !repositoryName.endsWith(".github.io") ? `/${repositoryName}/` : "/";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? githubPagesBase,
  server: {
    port: 5173,
    strictPort: true
  }
});
