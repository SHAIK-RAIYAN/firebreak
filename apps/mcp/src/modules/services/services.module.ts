import { Module } from "@nitrostack/core";
import { ServiceTools } from "./services.tools.js";
import { KeyService } from "../../shared/key.service.js";
import { McpKeyGuard } from "../../auth/mcp-key.guard.js";

@Module({
  name: "services",
  controllers: [ServiceTools],
  providers: [KeyService, McpKeyGuard],
})
export class ServicesModule {}
