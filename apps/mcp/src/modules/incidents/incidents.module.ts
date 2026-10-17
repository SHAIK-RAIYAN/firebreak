import { Module } from "@nitrostack/core";
import { IncidentTools } from "./incidents.tools.js";
import { KeyService } from "../../shared/key.service.js";
import { McpKeyGuard } from "../../auth/mcp-key.guard.js";

@Module({
  name: "incidents",
  controllers: [IncidentTools],
  providers: [KeyService, McpKeyGuard],
})
export class IncidentsModule {}
