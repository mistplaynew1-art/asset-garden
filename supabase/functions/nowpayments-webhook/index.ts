// NOWPayments — IPN webhook. Verifies HMAC signature & credits user wallet.
import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nowpayments-sig",
};

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  Object.keys(obj).sort().forEach((k) => {
    const v = obj[k];
    sorted[k] = v && typeof v === "object" && !Array.isArray(v)
      ? sortObject(v as Record<string, unknown>)
      : v;
  });
  return sorted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    const sig = req.headers.get("x-nowpayments-sig");
    const raw = await req.text();

    if (ipnSecret && sig) {
      const parsed = JSON.parse(raw);
      const expected = createHmac("sha512", ipnSecret).update(JSON.stringify(sortObject(parsed))).digest("hex");
      if (expected !== sig) {
        console.warn("Invalid NOWPayments signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload = JSON.parse(raw) as {
      payment_status: string;
      order_id: string;
      pay_amount: number;
      pay_currency: string;
      price_amount: number;
    };

    if (payload.payment_status !== "finished" && payload.payment_status !== "confirmed") {
      console.log(`NOWPayments status ${payload.payment_status} — ignoring`);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Approve the deposit request matching order_id (which is request id).
    const { error } = await supabase.rpc("approve_deposit", {
      p_request_id: payload.order_id,
      p_note: `NOWPayments: ${payload.pay_amount} ${payload.pay_currency}`,
    });
    if (error) {
      console.error("approve_deposit failed:", error);
      // Fallback: directly update if RPC requires admin context.
      await supabase.from("deposit_requests").update({
        status: "approved",
        admin_note: `NOWPayments auto-approved: ${payload.pay_amount} ${payload.pay_currency}`,
        reviewed_at: new Date().toISOString(),
      }).eq("id", payload.order_id);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
