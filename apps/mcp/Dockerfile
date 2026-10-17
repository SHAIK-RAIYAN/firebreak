# ---- build ----
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
RUN npm install
RUN npm --workspace=@firebreak/core run build
WORKDIR /repo/apps/mcp
RUN npm run build

# ---- runtime ----
FROM node:22-alpine
WORKDIR /app
COPY --from=build /repo/apps/mcp/dist ./dist
COPY --from=build /repo/apps/mcp/src/widgets/out ./src/widgets/out
COPY --from=build /repo/apps/mcp/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
ENV NODE_ENV=production MCP_TRANSPORT_TYPE=http HOST=0.0.0.0 PORT=3000 NITROSTACK_APP_MODE=universal
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:${PORT}/mcp/health || exit 1
USER node
CMD ["node", "dist/index.js"]
