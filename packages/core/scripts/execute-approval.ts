import { db, userCtx, approveAction } from "../src/index.js";

async function main() {
  const workspaceId = "ws_1alsok80tozt4sqaq650";
  const actionId = "act_cdo8g2jf0okvcfjhg7gn";
  const ctx = userCtx(workspaceId, "usr_operator");

  console.log(`Approving action ${actionId} for workspace ${workspaceId}...`);
  const action = await approveAction(ctx, actionId, {
    note: "Confirmed by human operator in incident room",
    via: "web",
  });

  console.log("Action successfully approved:", {
    id: action.id,
    status: action.status,
    decided_via: action.decided_via,
    decided_at: action.decided_at,
  });
}

main().catch(console.error);
