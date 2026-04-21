// Checkout.com — create hosted-payment session for card deposit.
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  amount: number;       // USD
  order_id: string;     // deposit_request id
  user_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("CHECKOUT_SECRET_KEY");
    if (!secret) {
      return new Response(JSON.stringify({ error: "CHECKOUT_SECRET_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body.amount || body.amount <= 0) throw new Error("Invalid amount");

    const origin = req.headers.get("origin") ?? "https://example.com";
    const isLive = !secret.startsWith("sk_sbox_");
    const apiBase = isLive ? "https://api.checkout.com" : "https://api.sandbox.checkout.com";

    const res = await fetch(`${apiBase}/hosted-payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(body.amount * 100), // cents
        currency: "USD",
        reference: body.order_id,
        billing: body.user_email ? { customer: { email: body.user_email } } : undefined,
        success_url: `${origin}/wallet?deposit=success`,
        failure_url: `${origin}/wallet?deposit=failed`,
        cancel_url: `${origin}/wallet?deposit=cancelled`,
        webhook: { url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/checkout-webhook` },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Checkout.com error:", data);
      return new Response(JSON.stringify({ error: data.error_type || "Checkout request failed" }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ session_url: data._links?.redirect?.href, id: data.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
