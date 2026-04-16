export const DEFAULT_START_COMMAND = "AUTO";
export const STARTUP_TEMPLATE_VERSION = "2026-04-15-git-bootstrap-v1";

export const DEFAULT_STARTUP_TEMPLATE = `cd /home/container || exit 1;
ensure_git() {
  if command -v git >/dev/null 2>&1; then
    return 0;
  fi;

  echo "Git chưa có trong image. Đang thử cài đặt...";
  if command -v apk >/dev/null 2>&1; then
    apk add --no-cache git >/dev/null 2>&1 || { echo "Không thể cài git bằng apk."; return 1; }
  elif command -v apt-get >/dev/null 2>&1; then
    apt-get update >/dev/null 2>&1 && apt-get install -y git >/dev/null 2>&1 || { echo "Không thể cài git bằng apt-get."; return 1; }
  elif command -v microdnf >/dev/null 2>&1; then
    microdnf install -y git >/dev/null 2>&1 || { echo "Không thể cài git bằng microdnf."; return 1; }
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y git >/dev/null 2>&1 || { echo "Không thể cài git bằng dnf."; return 1; }
  elif command -v yum >/dev/null 2>&1; then
    yum install -y git >/dev/null 2>&1 || { echo "Không thể cài git bằng yum."; return 1; }
  else
    echo "Image hiện tại không có sẵn package manager để cài git.";
    return 1;
  fi;
}

if [ "$AUTO_PULL" = "1" ] && [ -n "$GIT_ADDRESS" ]; then
  echo "Auto pulling repository...";
  ensure_git || echo "Bỏ qua auto pull vì không có git."
  if command -v git >/dev/null 2>&1; then
  if [ -n "$GIT_TOKEN" ]; then
    GIT_AUTH_USER="\${GIT_USER:-x-access-token}";
    GIT_REMOTE_URL="https://$GIT_AUTH_USER:$GIT_TOKEN@$(echo "$GIT_ADDRESS" | sed -E 's#https?://##')";
  else
    GIT_REMOTE_URL="$GIT_ADDRESS";
  fi;
  if [ ! -d .git ]; then
    echo "Repository chưa được clone. Đang clone source...";
    find . -mindepth 1 -maxdepth 1 ! -name '.minibot-cache' -exec rm -rf {} + >/dev/null 2>&1 || true;
    git clone --depth=1 --branch "$BRANCH" "$GIT_REMOTE_URL" . || echo "Clone repository thất bại.";
  else
    git remote set-url origin "$GIT_REMOTE_URL" >/dev/null 2>&1 || true;
    git fetch origin && git reset --hard origin/$BRANCH;
  fi;
  fi;
else
  echo "Skipping auto pull.";
fi;
install_node_dependencies() {
  if [ ! -f package.json ] || ! command -v npm >/dev/null 2>&1; then
    return 0;
  fi;

  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
    pnpm install || exit 1;
    START_CMD="pnpm start";
  elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
    yarn install || exit 1;
    START_CMD="yarn start";
  else
    npm install || exit 1;
    START_CMD="npm run start";
  fi;
}

install_python_dependencies() {
  if ! command -v python >/dev/null 2>&1; then
    echo "Image hiện tại không có python."; exit 1;
  fi;

  mkdir -p .minibot-cache;
  python -m pip install --upgrade pip >/dev/null 2>&1 || true;

  if [ -f requirements.txt ]; then
    REQ_HASH="$(python -c "import hashlib, pathlib; print(hashlib.sha256(pathlib.Path('requirements.txt').read_bytes()).hexdigest())")";
    REQ_MARKER=".minibot-cache/requirements-$REQ_HASH.done";
    if [ ! -f "$REQ_MARKER" ]; then
      python -m pip install -r requirements.txt || exit 1;
      rm -f .minibot-cache/requirements-*.done;
      : > "$REQ_MARKER";
    else
      echo "Python requirements unchanged. Skipping pip install.";
    fi;
  fi;

  if [ -f pyproject.toml ]; then
    PYPROJECT_HASH="$(python -c "import hashlib, pathlib; data=pathlib.Path('pyproject.toml').read_bytes(); lock=pathlib.Path('poetry.lock'); print(hashlib.sha256(data + (lock.read_bytes() if lock.exists() else b'')).hexdigest())")";
    PYPROJECT_MARKER=".minibot-cache/pyproject-$PYPROJECT_HASH.done";
    if [ ! -f "$PYPROJECT_MARKER" ]; then
      if [ -f poetry.lock ] || grep -q '^\[tool\.poetry\]' pyproject.toml 2>/dev/null; then
        python -m pip install poetry || exit 1;
        poetry config virtualenvs.create false >/dev/null 2>&1 || true;
        poetry install --no-interaction --no-ansi --no-root || exit 1;
      elif grep -q '^\[build-system\]' pyproject.toml 2>/dev/null; then
        python -m pip install . || exit 1;
      fi;
      rm -f .minibot-cache/pyproject-*.done;
      : > "$PYPROJECT_MARKER";
    else
      echo "Python project dependencies unchanged. Skipping install.";
    fi;
  fi;
}

run_first_python_file() {
  if [ -f main.py ]; then python main.py;
  elif [ -f app.py ]; then python app.py;
  elif [ -f bot.py ]; then python bot.py;
  else
    FIRST_PY="$(find . -maxdepth 1 -type f -name '*.py' | sort | head -n 1)";
    [ -n "$FIRST_PY" ] && python "$FIRST_PY" || { echo "Không tìm thấy file Python để chạy."; exit 1; }
  fi;
}

if [ "{{STARTUPSCRIPT}}" = "AUTO" ]; then
  if [ -x ./start.sh ]; then
    ./start.sh;
  elif [ -f ./start.sh ]; then
    sh ./start.sh;
  elif [ -f Procfile ]; then
    PROC_CMD="$(sed -n 's/^web:[[:space:]]*//p' Procfile | head -n 1)";
    if [ -n "$PROC_CMD" ]; then
      sh -lc "$PROC_CMD";
    else
      echo "Procfile tồn tại nhưng không có dòng web: hợp lệ."; exit 1;
    fi;
  elif [ -f package.json ] && command -v npm >/dev/null 2>&1; then
    install_node_dependencies;
    if npm run | grep -q " start"; then
      $START_CMD;
    elif node -e "const p=require('./package.json'); process.exit(p.main?0:1)" 2>/dev/null; then
      node "$(node -p "require('./package.json').main")";
    else
      echo "package.json không có start script hoặc main."; exit 1;
    fi;
  elif [ -f requirements.txt ] || [ -f pyproject.toml ]; then
    install_python_dependencies;
    run_first_python_file;
  elif [ -f go.mod ] && command -v go >/dev/null 2>&1; then
    [ -f main.go ] && go run main.go || go run .;
  elif [ -f Cargo.toml ] && command -v cargo >/dev/null 2>&1; then
    cargo run --release;
  elif { [ -f pom.xml ] || [ -f build.gradle ] || [ -f build.gradle.kts ]; } && { command -v mvn >/dev/null 2>&1 || command -v gradle >/dev/null 2>&1 || [ -x ./gradlew ]; }; then
    if [ -f pom.xml ] && command -v mvn >/dev/null 2>&1; then
      mvn -q -DskipTests package; JAR="$(ls -1 target/*.jar 2>/dev/null | head -n 1)";
    else
      if [ -x ./gradlew ]; then ./gradlew -q build -x test; else gradle -q build -x test; fi;
      JAR="$(ls -1 build/libs/*.jar 2>/dev/null | head -n 1)";
    fi;
    [ -n "$JAR" ] && java -jar "$JAR" || { echo "Không tìm thấy file .jar đã build."; exit 1; }
  elif [ -f composer.json ] && command -v php >/dev/null 2>&1; then
    [ -f artisan ] && php artisan serve --host=0.0.0.0 --port=3000 || php -S 0.0.0.0:3000;
  elif [ -f Gemfile ] && command -v bundle >/dev/null 2>&1; then
    bundle install && (bundle exec ruby app.rb || bundle exec ruby main.rb || bundle exec ruby bot.rb);
  elif [ -f main.jar ] && command -v java >/dev/null 2>&1; then
    java -jar main.jar;
  elif [ -f main.js ] && command -v node >/dev/null 2>&1; then
    node main.js;
  elif [ -f index.js ] && command -v node >/dev/null 2>&1; then
    node index.js;
  elif [ -f main.ts ] && command -v npx >/dev/null 2>&1; then
    [ -f package.json ] && install_node_dependencies;
    npx tsx main.ts;
  elif [ -f index.ts ] && command -v npx >/dev/null 2>&1; then
    [ -f package.json ] && install_node_dependencies;
    npx tsx index.ts;
  elif [ -f main.py ] && command -v python >/dev/null 2>&1; then
    install_python_dependencies;
    python main.py;
  elif [ -f app.py ] && command -v python >/dev/null 2>&1; then
    install_python_dependencies;
    python app.py;
  elif [ -f bot.py ] && command -v python >/dev/null 2>&1; then
    install_python_dependencies;
    python bot.py;
  elif find . -maxdepth 1 -type f -name '*.py' | grep -q . && command -v python >/dev/null 2>&1; then
    install_python_dependencies;
    run_first_python_file;
  else
    echo "Không tự nhận diện được project. Hãy nhập Startup Command thủ công."; exit 1;
  fi;
else
  CUSTOM_START="{{STARTUPSCRIPT}}";

  if printf '%s\n' "$CUSTOM_START" | grep -Eiq '^(python|poetry|uvicorn|gunicorn)|\.py([[:space:]]|$)|^uv[[:space:]]+run[[:space:]]+python'; then
    if [ -f requirements.txt ] || [ -f pyproject.toml ] || find . -maxdepth 1 -type f -name '*.py' | grep -q .; then
      install_python_dependencies;
    fi;
  elif printf '%s\n' "$CUSTOM_START" | grep -Eiq '^(npm|node|pnpm|yarn|tsx|npx[[:space:]]+tsx)'; then
    if [ -f package.json ]; then
      install_node_dependencies;
    fi;
  fi;

  sh -lc "$CUSTOM_START";
fi;`;

export function resolveStartupTemplate(template?: string | null) {
  if (!template?.trim()) {
    return DEFAULT_STARTUP_TEMPLATE;
  }

  const looksLikeLegacyDefault =
    template.includes('[ -f requirements.txt ] && python -m pip install -r requirements.txt;') &&
    !template.includes("install_python_dependencies()");

  return looksLikeLegacyDefault ? DEFAULT_STARTUP_TEMPLATE : template;
}
