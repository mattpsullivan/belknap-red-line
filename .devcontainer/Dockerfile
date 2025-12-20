FROM mcr.microsoft.com/devcontainers/typescript-node:22

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        curl \
        jq \
        sqlite3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN su node -c "npm install -g \
    npm@latest \
    pnpm \
    tsx \
    @biomejs/biome \
    @anthropic-ai/claude-code \
    @google/gemini-cli"

# Set up shell history persistence
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    && mkdir /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R node /commandhistory \
    && echo "$SNIPPET" >> "/home/node/.bashrc"
