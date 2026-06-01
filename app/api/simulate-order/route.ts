import { placeSimulatedOrder } from "@/lib/sim/place-simulated-order";
import { ok, err } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const POST = withAuth(["owner", "admin"], async () => {
  try {
    const order = await placeSimulatedOrder();
    if (!order) return err("NO_OPEN_VENDORS", "No open vendors to simulate against", 409);
    return ok({ success: true, order }, { status: 201 });
  } catch (e) {
    return err("INTERNAL", e instanceof Error ? e.message : "Simulator failed", 500);
  }
});
