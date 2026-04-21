// NOWPayments — create invoice for crypto deposit.
// Reads NOWPAYMENTS_API_KEY from secrets, returns hosted invoice URL.
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  amount: number;          // USD
  currency: string;        // crypto code, e.g. "btc", "eth"
  order_id: string;        // our deposit_request id
  user_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "NOWPAYMENTS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body.amount || body.amount <= 0) throw new Error("Invalid amount");
    if (!body.currency) throw new Error("Currency required");

    const origin = req.headers.get("origin") ?? "https://example.com";

    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: body.amount,
        price_currency: "usd",
        pay_currency: body.currency,
        order_id: body.order_id,
        order_description: `Casino deposit ${body.order_id}`,
        ipn_callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nowpayments-webhook`,
        success_url: `${origin}/wallet?deposit=success`,
        cancel_url: `${origin}/wallet?deposit=cancelled`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("NOWPayments error:", data);
      return new Response(JSON.stringify({ error: data.message || "NOWPayments request failed" }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ invoice_url: data.invoice_url, id: data.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
