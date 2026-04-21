// Checkout.com — webhook receiver. Verifies signature & approves deposit.
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cko-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("CHECKOUT_WEBHOOK_SECRET");
    const sig = req.headers.get("cko-signature");
    const raw = await req.text();

    if (secret && sig) {
      const computed = createHmac("sha256", secret).update(raw).digest("hex");
      const a = Buffer.from(computed);
      const b = Buffer.from(sig);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        console.warn("Invalid Checkout.com signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const event = JSON.parse(raw) as { type: string; data: { reference?: string; amount?: number; currency?: string } };
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event.type === "payment_captured" || event.type === "payment_approved") {
      const ref = event.data.reference;
      if (!ref) return new Response("missing reference", { status: 400 });
      const { error } = await supabase.rpc("approve_deposit", {
        p_request_id: ref,
        p_note: `Checkout.com: ${event.type}`,
      });
      if (error) {
        await supabase.from("deposit_requests").update({
          status: "approved",
          admin_note: `Checkout.com auto-approved: ${event.type}`,
          reviewed_at: new Date().toISOString(),
        }).eq("id", ref);
      }
    } else if (event.type === "payment_declined" || event.type === "payment_canceled") {
      const ref = event.data.reference;
      if (ref) {
        await supabase.from("deposit_requests").update({
          status: "rejected",
          admin_note: `Checkout.com: ${event.type}`,
          reviewed_at: new Date().toISOString(),
        }).eq("id", ref);
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
