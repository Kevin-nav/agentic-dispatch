FROM node:24-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_PREFIX=/opt/npm-global
RUN npm install -g t3@0.0.23 @openai/codex@0.130.0

FROM node:24-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl git openssh-client procps ripgrep \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 10001 agentic \
  && useradd --uid 10001 --gid 10001 --create-home --home-dir /home/agentic --shell /bin/bash agentic

ENV NPM_CONFIG_PREFIX=/opt/npm-global
ENV PATH=/opt/npm-global/bin:$PATH
ENV T3CODE_HOME=/var/lib/t3code
ENV CODEX_HOME=/var/lib/codex

COPY --from=build /opt/npm-global /opt/npm-global
COPY entrypoint.sh /usr/local/bin/t3-code-server-entrypoint

RUN chmod 0755 /usr/local/bin/t3-code-server-entrypoint \
  && mkdir -p /var/lib/t3code /var/lib/codex /workspaces/agentic-dispatch \
  && chown -R 10001:10001 /var/lib/t3code /var/lib/codex /workspaces/agentic-dispatch /home/agentic

USER 10001:10001
WORKDIR /workspaces/agentic-dispatch
EXPOSE 3773

ENTRYPOINT ["t3-code-server-entrypoint"]
