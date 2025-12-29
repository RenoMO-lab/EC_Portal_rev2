import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_STORE_DOMAIN = "bh98iy-u9.myshopify.com";
const SHOPIFY_API_VERSION = "2025-01";

// Get the first merchant user ID and their return settings (for single-merchant setup)
async function getMerchantData(): Promise<{ 
  merchantUserId: string | null; 
  returnReasons: string[];
  enabledReturnTypes: { id: string; label: string; description: string | null; return_type: string }[];
  shippingFeeSettings: { return_shipping_fee: number; new_product_shipping_fee: number; currency: string } | null;
}> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get merchant user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();
  
  if (profileError || !profile) {
    console.error("Error getting merchant user:", profileError);
    return { 
      merchantUserId: null, 
      returnReasons: [], 
      enabledReturnTypes: [
        { id: 'default-refund', label: 'Refund to original payment', description: 'Customer receives money back to their original payment method', return_type: 'refund' },
        { id: 'default-exchange', label: 'Exchange for another item', description: 'Customer can swap for a different product', return_type: 'exchange' },
        { id: 'default-store-credit', label: 'Store credit', description: 'Customer receives credit to use on future purchases', return_type: 'store_credit' },
      ],
      shippingFeeSettings: null
    };
  }
  
  // Get active return reasons for this merchant
  const { data: reasons, error: reasonsError } = await supabase
    .from("return_reasons")
    .select("reason")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  
  if (reasonsError) {
    console.error("Error getting return reasons:", reasonsError);
  }
  
  const returnReasons = reasons?.map(r => r.reason) || [
    "Wrong size",
    "Wrong color",
    "Damaged or defective",
    "Changed my mind",
    "Received wrong item",
    "Quality not as expected",
    "Other"
  ];
  
  // Get active return type options for this merchant
  const { data: returnTypeOptions, error: typesError } = await supabase
    .from("return_type_options")
    .select("id, label, description, return_type")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  
  if (typesError) {
    console.error("Error getting return type options:", typesError);
  }
  
  const enabledReturnTypes = returnTypeOptions && returnTypeOptions.length > 0 
    ? returnTypeOptions 
    : [
        { id: 'default-refund', label: 'Refund to original payment', description: 'Customer receives money back to their original payment method', return_type: 'refund' },
        { id: 'default-exchange', label: 'Exchange for another item', description: 'Customer can swap for a different product', return_type: 'exchange' },
        { id: 'default-store-credit', label: 'Store credit', description: 'Customer receives credit to use on future purchases', return_type: 'store_credit' },
      ];
  
  // Get shipping fee settings for this merchant
  const { data: shippingSettings, error: shippingError } = await supabase
    .from("shipping_fee_settings")
    .select("return_shipping_fee, new_product_shipping_fee, currency")
    .eq("user_id", profile.id)
    .maybeSingle();
  
  if (shippingError) {
    console.error("Error getting shipping fee settings:", shippingError);
  }
  
  const shippingFeeSettings = shippingSettings ? {
    return_shipping_fee: shippingSettings.return_shipping_fee,
    new_product_shipping_fee: shippingSettings.new_product_shipping_fee,
    currency: shippingSettings.currency
  } : null;
  
  return { 
    merchantUserId: profile.id, 
    returnReasons,
    enabledReturnTypes,
    shippingFeeSettings
  };
}

interface OrderLineItem {
  id: string;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: string;
  product_id: number;
  variant_id: number;
  sku: string | null;
  image?: {
    src: string;
  };
}

interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  fulfillment_status: string | null;
  financial_status: string;
  total_price: string;
  currency: string;
  line_items: OrderLineItem[];
  customer: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  shipping_address?: {
    first_name: string | null;
    last_name: string | null;
    address1: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    country: string | null;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNumber } = await req.json();

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ error: "Order number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("SHOPIFY_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Shopify integration not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean the order number - remove # and any whitespace, keep just the number
    const cleanOrderNumber = orderNumber.replace(/[#\s]/g, "").trim();
    
    // Shopify order names are typically like "#1001" - search requires the number
    console.log("Searching for order number:", cleanOrderNumber);
    
    // Search for orders by name (order number) - Shopify expects just the number for name filter
    const searchUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?name=${encodeURIComponent(cleanOrderNumber)}&status=any`;
    
    console.log("Search URL:", searchUrl);

    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to search orders" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const orders = data.orders || [];
    
    console.log("Found orders count:", orders.length);

    if (orders.length === 0) {
      console.log("No order found with order number:", cleanOrderNumber);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Use the first matching order
    const matchingOrder = orders[0];
    console.log("Found order:", matchingOrder.name);

    // Fetch product images for each line item
    // Fetch variant images for each line item
    const variantIds = matchingOrder.line_items
      .filter((item: any) => item.variant_id)
      .map((item: any) => item.variant_id);
    const variantImages: Record<number, string> = {};
    const productImages: Record<number, string> = {};
    
    // Fetch variant-specific images
    for (const variantId of variantIds) {
      try {
        const variantUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`;
        const variantResponse = await fetch(variantUrl, {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });
        
        if (variantResponse.ok) {
          const variantData = await variantResponse.json();
          if (variantData.variant?.image_id) {
            // Fetch the specific image by ID
            const productId = variantData.variant.product_id;
            const imageId = variantData.variant.image_id;
            const imageUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`;
            const imageResponse = await fetch(imageUrl, {
              method: "GET",
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
              },
            });
            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              if (imageData.image?.src) {
                variantImages[variantId] = imageData.image.src;
              }
            }
          }
          // Also store product ID for fallback
          if (!productImages[variantData.variant?.product_id]) {
            productImages[variantData.variant?.product_id] = '';
          }
        }
      } catch (err) {
        console.error(`Failed to fetch variant ${variantId}:`, err);
      }
    }
    
    // Fetch product images as fallback for variants without specific images
    const productIds = Array.from(new Set(matchingOrder.line_items.map((item: any) => item.product_id).filter((id: any) => id))) as number[];
    for (const productId of productIds) {
      try {
        const productUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json?fields=id,images`;
        const productResponse = await fetch(productUrl, {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });
        
        if (productResponse.ok) {
          const productData = await productResponse.json();
          if (productData.product?.images?.[0]?.src) {
            productImages[productId] = productData.product.images[0].src;
          }
        }
      } catch (err) {
        console.error(`Failed to fetch product ${productId}:`, err);
      }
    }
    
    console.log("Fetched variant images for", Object.keys(variantImages).length, "variants");
    console.log("Fetched product images for", Object.keys(productImages).length, "products");

    // Get the merchant data including return settings
    const { merchantUserId, returnReasons, enabledReturnTypes, shippingFeeSettings } = await getMerchantData();
    console.log("Merchant user ID:", merchantUserId);
    console.log("Shipping fee settings:", shippingFeeSettings);

    // Transform to our format
    const orderData = {
      orderId: `gid://shopify/Order/${matchingOrder.id}`,
      orderNumber: matchingOrder.name,
      customerName: matchingOrder.customer
        ? `${matchingOrder.customer.first_name || ""} ${matchingOrder.customer.last_name || ""}`.trim() || "Customer"
        : "Customer",
      customerEmail: matchingOrder.email || matchingOrder.contact_email || matchingOrder.customer?.email,
      orderDate: matchingOrder.created_at,
      totalAmount: parseFloat(matchingOrder.total_price),
      currency: matchingOrder.currency,
      fulfillmentStatus: matchingOrder.fulfillment_status || "unfulfilled",
      financialStatus: matchingOrder.financial_status,
      items: matchingOrder.line_items.map((item: any) => ({
        id: `item-${item.id}`,
        title: item.title,
        variantTitle: item.variant_title || "Default",
        quantity: item.quantity,
        price: parseFloat(item.price),
        productId: `gid://shopify/Product/${item.product_id}`,
        variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
        sku: item.sku,
        // Prioritize variant-specific image, fallback to product image
        imageUrl: variantImages[item.variant_id] || productImages[item.product_id] || null,
      })),
      shippingAddress: matchingOrder.shipping_address || null,
      merchantUserId: merchantUserId,
      returnReasons: returnReasons,
      enabledReturnTypes: enabledReturnTypes,
      shippingFeeSettings: shippingFeeSettings,
    };

    return new Response(
      JSON.stringify({ order: orderData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in lookup-order:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
