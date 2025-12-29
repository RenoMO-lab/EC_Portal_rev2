import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received return submission:", JSON.stringify(body, null, 2));

    const {
      orderId,
      orderNumber,
      customerEmail,
      customerName,
      originalAmount,
      refundAmount,
      reason,
      returnType,
      customerNotes,
      otherReasonDescription,
      defectImageUrls,
      items,
      merchantUserId, // The merchant who owns this store
    } = body;

    // Validate required fields (customerEmail can be empty for some orders)
    if (!orderId || !orderNumber || !customerName || !reason) {
      console.error("Missing required fields", { orderId, orderNumber, customerName, reason });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the default policy for this merchant
    let defaultPolicyId = null;
    if (merchantUserId) {
      const { data: defaultPolicy } = await supabase
        .from("return_policies")
        .select("id")
        .eq("user_id", merchantUserId)
        .eq("is_default", true)
        .eq("is_active", true)
        .single();
      
      if (defaultPolicy) {
        defaultPolicyId = defaultPolicy.id;
        console.log("Found default policy:", defaultPolicyId);
      }
    }

    // Insert the return request
    const { data: returnRequest, error: returnError } = await supabase
      .from("return_requests")
      .insert({
        order_id: orderId,
        order_number: orderNumber,
        customer_email: customerEmail || "no-email@placeholder.com",
        customer_name: customerName,
        original_amount: originalAmount,
        refund_amount: refundAmount,
        reason: reason,
        return_type: returnType || "refund",
        customer_notes: customerNotes || null,
        other_reason_description: otherReasonDescription || null,
        defect_image_urls: defectImageUrls || [],
        status: "pending",
        user_id: merchantUserId || "00000000-0000-0000-0000-000000000000",
        policy_id: defaultPolicyId,
      })
      .select()
      .single();

    if (returnError) {
      console.error("Error inserting return request:", returnError);
      return new Response(
        JSON.stringify({ error: "Failed to create return request", details: returnError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Return request created:", returnRequest.id);

    // Insert return items if provided
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        return_request_id: returnRequest.id,
        product_id: item.productId,
        product_name: item.productName,
        variant_id: item.variantId || null,
        variant_name: item.variantName || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        product_image_url: item.productImageUrl || null,
        // Exchange-specific fields
        exchange_product_id: item.exchangeProductId || null,
        exchange_product_name: item.exchangeProductName || null,
        exchange_variant_id: item.exchangeVariantName || null, // Store the selected size/variant
      }));

      const { error: itemsError } = await supabase
        .from("return_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error inserting return items:", itemsError);
        // Don't fail the whole request, just log the error
      } else {
        console.log("Return items created:", items.length);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        returnRequestId: returnRequest.id,
        message: "Return request submitted successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
