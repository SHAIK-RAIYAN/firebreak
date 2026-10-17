import { McpApp, Module, ConfigModule } from "@nitrostack/core";
import { IncidentsModule } from "./modules/incidents/incidents.module.js";
import { ActionsModule } from "./modules/actions/actions.module.js";
import { ServicesModule } from "./modules/services/services.module.js";
import { SystemHealthCheck } from "./health/system.health.js";

/**
 * Root Application Module
 *
 * Bootstraps the Firebreak NitroStack MCP server.
 * Registers feature modules for Incidents, Actions, Services, and System Health.
 */
@McpApp({
  module: AppModule,
  server: {
    name: "firebreak",
    version: "0.1.0",
  },
  logging: {
    level: (process.env.NITRO_LOG_LEVEL as any) ?? "info",
  },
})
@Module({
  name: "app",
  description: "Firebreak root MCP application module",
  imports: [
    ConfigModule.forRoot(),
    IncidentsModule,
    ActionsModule,
    ServicesModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
