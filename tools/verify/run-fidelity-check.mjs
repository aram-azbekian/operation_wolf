import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import http from "node:http";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
      }
    });
  });

const waitForUrl = (url, timeoutMs = 30000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();

    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      req.on("error", retry);
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tryOnce, 500);
    };

    tryOnce();
  });

const previewUrl = "http://127.0.0.1:4173/";
let previewProc = null;

try {
  await run("npm", ["run", "build"]);
  await run("npm", ["run", "verify:reference"]);

  previewProc = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], {
    cwd: root,
    stdio: "inherit",
    shell: false
  });

  await waitForUrl(previewUrl, 30000);
  await run("npm", ["run", "verify:candidate"], {
    env: {
      ...process.env,
      APP_URL: previewUrl
    }
  });
} finally {
  if (previewProc) {
    previewProc.kill("SIGTERM");
  }
}

let failed = false;

try {
  await run("npm", ["run", "verify:diff"]);
} catch (error) {
  failed = true;
  console.error(error.message);
}

try {
  await run("npm", ["run", "verify:metrics"]);
} catch (error) {
  failed = true;
  console.error(error.message);
}

if (failed) {
  process.exitCode = 1;
}
