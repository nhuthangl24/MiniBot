import fs from "fs/promises";
import path from "path";

type DetectionResult = {
  startCommand: string;
  envType: string;
  reason: string;
  files: string[];
};

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageStart(sourcePath: string) {
  try {
    const raw = await fs.readFile(path.join(sourcePath, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as {
      scripts?: Record<string, string>;
      main?: string;
      packageManager?: string;
    };

    if (pkg.scripts?.start) {
      const pm = pkg.packageManager || "";
      if (pm.startsWith("pnpm")) return "pnpm start";
      if (pm.startsWith("yarn")) return "yarn start";
      return "npm run start";
    }

    if (pkg.main) {
      return `node ${pkg.main}`;
    }
  } catch {}

  return null;
}

export async function detectStartupFromSource(sourcePath: string): Promise<DetectionResult> {
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();

  const has = (name: string) => files.includes(name);
  const firstMatching = (...names: string[]) => names.find((name) => has(name)) || null;

  if (has("start.sh")) {
    return {
      startCommand: "sh ./start.sh",
      envType: "ubuntu:22.04",
      reason: "Tìm thấy start.sh trong source.",
      files,
    };
  }

  if (has("Procfile")) {
    try {
      const procfile = await fs.readFile(path.join(sourcePath, "Procfile"), "utf8");
      const webLine = procfile
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.startsWith("web:"));
      if (webLine) {
        return {
          startCommand: webLine.replace(/^web:\s*/, ""),
          envType: "ubuntu:22.04",
          reason: "Tìm thấy Procfile với dòng web:.",
          files,
        };
      }
    } catch {}
  }

  if (has("package.json")) {
    const command = await readPackageStart(sourcePath);
    if (command) {
      return {
        startCommand: command,
        envType: "node:20-alpine",
        reason: "Tìm thấy package.json.",
        files,
      };
    }
  }

  const tsEntry = firstMatching("main.ts", "index.ts");
  if (tsEntry) {
    return {
      startCommand: `npx tsx ${tsEntry}`,
      envType: "node:20-alpine",
      reason: `Tìm thấy ${tsEntry}.`,
      files,
    };
  }

  const jsEntry = firstMatching("main.js", "index.js", "server.js", "app.js");
  if (jsEntry) {
    return {
      startCommand: `node ${jsEntry}`,
      envType: "node:20-alpine",
      reason: `Tìm thấy ${jsEntry}.`,
      files,
    };
  }

  if (has("requirements.txt") || has("pyproject.toml")) {
    const pyEntry = firstMatching("main.py", "app.py", "bot.py");
    return {
      startCommand: pyEntry ? `python ${pyEntry}` : "python ./main.py",
      envType: "python:3.11-slim",
      reason: "Tìm thấy requirements.txt hoặc pyproject.toml.",
      files,
    };
  }

  const genericPy = files.find((file) => file.endsWith(".py"));
  if (genericPy) {
    return {
      startCommand: `python ${genericPy}`,
      envType: "python:3.11-slim",
      reason: `Tìm thấy file Python ${genericPy}.`,
      files,
    };
  }

  if (has("go.mod")) {
    return {
      startCommand: has("main.go") ? "go run main.go" : "go run .",
      envType: "golang:1.22-alpine",
      reason: "Tìm thấy go.mod.",
      files,
    };
  }

  if (has("Cargo.toml")) {
    return {
      startCommand: "cargo run --release",
      envType: "rust:1.77",
      reason: "Tìm thấy Cargo.toml.",
      files,
    };
  }

  if (has("pom.xml") || has("build.gradle") || has("build.gradle.kts")) {
    return {
      startCommand: "java -jar $(ls -1 target/*.jar build/libs/*.jar 2>/dev/null | head -n 1)",
      envType: "eclipse-temurin:21-jdk",
      reason: "Tìm thấy project Java/Gradle/Maven.",
      files,
    };
  }

  if (has("composer.json")) {
    return {
      startCommand: has("artisan")
        ? "php artisan serve --host=0.0.0.0 --port=3000"
        : "php -S 0.0.0.0:3000",
      envType: "ubuntu:22.04",
      reason: "Tìm thấy composer.json.",
      files,
    };
  }

  if (has("Gemfile")) {
    return {
      startCommand: "bundle exec ruby app.rb",
      envType: "ubuntu:22.04",
      reason: "Tìm thấy Gemfile.",
      files,
    };
  }

  if (await fileExists(path.join(sourcePath, "main.jar"))) {
    return {
      startCommand: "java -jar main.jar",
      envType: "eclipse-temurin:21-jdk",
      reason: "Tìm thấy main.jar.",
      files,
    };
  }

  return {
    startCommand: "AUTO",
    envType: "ubuntu:22.04",
    reason: "Không phát hiện được framework rõ ràng. Dùng AUTO hoặc nhập command thủ công.",
    files,
  };
}
