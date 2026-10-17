import { Module } from "@nitrostack/core";
import { ActionTools } from "./actions.tools.js";
import { KeyService } from "../../shared/key.service.js";
import { McpKeyGuard } from "../../auth/mcp-key.guard.js";

@Module({
  name: "actions",
  controllers: [ActionTools],
  providers: [KeyService, McpKeyGuard],
})
export class ActionsModule {}
