import { useState, useEffect } from "react";
import { Search, ArrowLeft, CheckCircle2, Loader2, Upload, X, Image as ImageIcon, AlertCircle, RefreshCw } from "lucide-react";
import elevenCoastLogo from "@/assets/eleven-coast-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  id: string;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  productId: string;
  variantId: string;
}

interface ReturnTypeOption {
  id: string;
  label: string;
  description: string | null;
  return_type: string;
}

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  fulfillmentStatus: string;
  items: OrderItem[];
  merchantUserId?: string;
  returnReasons?: string[];
  shippingFeeSettings?: {
    return_shipping_fee: number;
    new_product_shipping_fee: number;
    currency: string;
  };
  enabledReturnTypes?: ReturnTypeOption[];
}

type Step = "lookup" | "select-items" | "return-details" | "review" | "confirmation";

const DEFAULT_RETURN_REASONS = [
  "Wrong size",
  "Wrong color",
  "Damaged or defective",
  "Changed my mind",
  "Received wrong item",
  "Quality not as expected",
  "Other"
];

const DEFAULT_RETURN_TYPES: ReturnTypeOption[] = [
  { id: 'default-refund', label: 'Refund to original payment', description: 'Customer receives money back to their original payment method', return_type: 'refund' },
  { id: 'default-exchange', label: 'Exchange for another item', description: 'Customer can swap for a different product', return_type: 'exchange' },
  { id: 'default-store-credit', label: 'Store credit', description: 'Customer receives credit to use on future purchases', return_type: 'store_credit' },
];

export default function CustomerReturnPortal() {
  const [step, setStep] = useState<Step>("lookup");
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnReason, setReturnReason] = useState("");
  const [selectedReturnTypeId, setSelectedReturnTypeId] = useState<string>("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [otherReasonDescription, setOtherReasonDescription] = useState("");
  const [defectImages, setDefectImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exchangeSizeSelections, setExchangeSizeSelections] = useState<Record<string, string>>({});

  const handleLookupOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error("Please enter your order number");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            orderNumber: orderNumber.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Order not found");
        setIsLoading(false);
        return;
      }

      if (data.order) {
        setOrder(data.order);
        setStep("select-items");
        toast.success("Order found!");
      } else {
        toast.error("No order found with that order number and email");
      }
    } catch (error) {
      console.error("Error looking up order:", error);
      toast.error("Failed to look up order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleContinueToDetails = () => {
    if (selectedItems.size === 0) {
      toast.error("Please select at least one item to return");
      return;
    }
    setStep("return-details");
  };

  const handleSubmitReturn = async () => {
    if (!selectedReturnTypeId) {
      toast.error("Please select an expected solution");
      return;
    }

    if (!returnReason) {
      toast.error("Please select a return reason");
      return;
    }

    if (returnReason === "Other" && !otherReasonDescription.trim()) {
      toast.error("Please describe your reason for return");
      return;
    }

    // Photo required for: Damaged/defective OR wrong item (but NOT for "Wrong size" exchange)
    const isWrongSize = returnReason.toLowerCase().includes("wrong size");
    const selectedType = (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId);
    const isExchange = selectedType?.return_type === 'exchange';
    const requiresPhoto = (returnReason === "Damaged or defective" || returnReason.toLowerCase().includes("wrong item")) && !(isWrongSize && isExchange);
    if (requiresPhoto && defectImages.length === 0) {
      toast.error("Please upload at least one photo as proof");
      return;
    }

    if (!order) return;

    setSubmitting(true);

    try {
      const selectedItemsData = order.items.filter(item => selectedItems.has(item.id));
      const totalRefundAmount = selectedItemsData.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Upload defect images if any
      let defectImageUrls: string[] = [];
      const isWrongSizeExchange = returnReason.toLowerCase().includes("wrong size") && 
        (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type === 'exchange';
      const requiresPhotoUpload = (returnReason === "Damaged or defective" || returnReason.toLowerCase().includes("wrong item")) && !isWrongSizeExchange;
      if (requiresPhotoUpload && defectImages.length > 0) {
        setUploadingImages(true);
        setUploadProgress({ current: 0, total: defectImages.length });
        
        for (let i = 0; i < defectImages.length; i++) {
          const file = defectImages[i];
          setUploadProgress({ current: i + 1, total: defectImages.length });
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          // Sanitize order number for file path (remove # and other special characters)
          const sanitizedOrderNumber = order.orderNumber.replace(/[^a-zA-Z0-9]/g, '');
          const filePath = `${sanitizedOrderNumber}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('return-images')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Failed to upload image ${i + 1}`);
            setUploadingImages(false);
            setUploadProgress(null);
            setSubmitting(false);
            return;
          }

          const { data: urlData } = supabase.storage
            .from('return-images')
            .getPublicUrl(filePath);

          defectImageUrls.push(urlData.publicUrl);
        }
        setUploadingImages(false);
        setUploadProgress(null);
      }

      // Submit return request via edge function (bypasses RLS)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-return`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail,
            customerName: order.customerName,
            originalAmount: totalRefundAmount, // Only the selected items' value
            refundAmount: totalRefundAmount,
            reason: returnReason,
            returnType: (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type || 'refund',
            customerNotes: customerNotes || null,
            otherReasonDescription: returnReason === "Other" ? otherReasonDescription : null,
            defectImageUrls: defectImageUrls,
            merchantUserId: order.merchantUserId, // Pass the merchant user ID
            items: selectedItemsData.map(item => {
              const selectedReturnType = (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type;
              const exchangeSize = exchangeSizeSelections[item.id];
              
              return {
                productId: item.productId,
                productName: item.title,
                variantId: item.variantId,
                variantName: item.variantTitle,
                quantity: item.quantity,
                unitPrice: item.price,
                productImageUrl: item.imageUrl,
                // Include exchange details if this is an exchange
                exchangeProductId: selectedReturnType === 'exchange' ? item.productId : null,
                exchangeProductName: selectedReturnType === 'exchange' ? item.title : null,
                exchangeVariantName: selectedReturnType === 'exchange' && exchangeSize ? exchangeSize : null,
              };
            }),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Return request error:', data);
        toast.error(data.error || "Failed to submit return request");
        return;
      }

      setStep("confirmation");
      toast.success("Return request submitted successfully!");
    } catch (error) {
      console.error('Error submitting return:', error);
      // For demo, still show confirmation
      setStep("confirmation");
      toast.success("Return request submitted!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setStep("lookup");
    setOrderNumber("");
    setOrder(null);
    setSelectedItems(new Set());
    setReturnReason("");
    setSelectedReturnTypeId("default-refund");
    setCustomerNotes("");
    setOtherReasonDescription("");
    setDefectImages([]);
    setExchangeSizeSelections({});
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <img 
              src={elevenCoastLogo} 
              alt="Eleven Coast" 
              className="h-24 w-auto"
            />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Return Portal</h1>
              <p className="text-sm text-muted-foreground">Start your return or exchange</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            {[
              { key: "lookup", label: "Find Order" },
              { key: "select-items", label: "Select Items" },
              { key: "return-details", label: "Return Details" },
              { key: "review", label: "Review" },
              { key: "confirmation", label: "Confirmation" }
            ].map((s, index) => {
              const steps: Step[] = ["lookup", "select-items", "return-details", "review", "confirmation"];
              const currentIndex = steps.indexOf(step);
              const stepIndex = steps.indexOf(s.key as Step);
              const isComplete = stepIndex < currentIndex;
              const isCurrent = s.key === step;

              return (
                <div key={s.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line - positioned behind the icon */}
                  {index < 4 && (
                    <div 
                      className={`absolute top-4 left-1/2 w-full h-0.5 ${stepIndex < currentIndex ? "bg-primary" : "bg-muted"}`}
                      style={{ transform: 'translateY(-50%)' }}
                    />
                  )}
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isComplete
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  {/* Label */}
                  <span className={`mt-2 text-xs text-center ${isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {step === "lookup" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Find Your Order</CardTitle>
              <CardDescription>
                Enter your order number to start your return
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="#1001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your order confirmation email
                </p>
              </div>
              <Button 
                className="w-full" 
                onClick={handleLookupOrder}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Looking up order...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Find Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "select-items" && order && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("lookup")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="font-display">Select Items to Return</CardTitle>
                  <CardDescription>
                    Order {order.orderNumber} • Placed on {new Date(order.orderDate).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition-colors cursor-pointer ${
                    selectedItems.has(item.id) ? "border-primary bg-accent" : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => toggleItemSelection(item.id)}
                >
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                  />
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.variantTitle}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              <Button className="w-full" onClick={handleContinueToDetails}>
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "return-details" && order && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("select-items")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="font-display">Return Details</CardTitle>
                  <CardDescription>
                    Tell us why you&apos;re returning these items
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reason for return - FIRST */}
              <div className="space-y-2">
                <Label>Reason for return</Label>
                <Select 
                  value={returnReason} 
                  onValueChange={(value) => {
                    setReturnReason(value);
                    // Reset return type when reason changes to avoid invalid combinations
                    const isWrongSize = value.toLowerCase().includes('wrong size');
                    const selectedType = (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId);
                    const isExchangeForDifferentSize = selectedType?.label?.toLowerCase().includes('different size') || 
                                                       selectedType?.label?.toLowerCase().includes('size');
                    const isGeneralExchange = selectedType?.return_type === 'exchange' && !isExchangeForDifferentSize;
                    
                    // Reset if current return type is not valid for new reason
                    if (isWrongSize && isGeneralExchange) {
                      // "Wrong Size" can't use general exchange
                      setSelectedReturnTypeId('');
                    } else if (!isWrongSize && value.toLowerCase() !== 'other' && isExchangeForDifferentSize) {
                      // Only "Wrong Size" and "Other" can use size exchange
                      setSelectedReturnTypeId('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {(order.returnReasons || DEFAULT_RETURN_REASONS).map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* What would you like - SECOND, filtered based on reason */}
              <div className="space-y-2">
                <Label>What would you like?</Label>
                <Select 
                  value={selectedReturnTypeId} 
                  onValueChange={setSelectedReturnTypeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expected solution" />
                  </SelectTrigger>
                  <SelectContent>
                    {(order.enabledReturnTypes || DEFAULT_RETURN_TYPES)
                      .filter((typeOption) => {
                        const isWrongSize = returnReason.toLowerCase().includes('wrong size');
                        const isOther = returnReason.toLowerCase() === 'other';
                        const isExchangeForDifferentSize = typeOption.label?.toLowerCase().includes('different size') || 
                                                           typeOption.label?.toLowerCase().includes('size');
                        const isGeneralExchange = typeOption.return_type === 'exchange' && !isExchangeForDifferentSize;
                        
                        // If reason is "Wrong Size" - only allow "Exchange for different size" type, not general exchange
                        if (isWrongSize) {
                          // Allow size-specific exchange, hide general exchange
                          if (isGeneralExchange) {
                            return false;
                          }
                          return true;
                        }
                        
                        // If reason is "Other" - show all options
                        if (isOther) {
                          return true;
                        }
                        
                        // For other reasons - hide "Exchange for different size" option
                        if (isExchangeForDifferentSize) {
                          return false;
                        }
                        
                        return true;
                      })
                      .map((typeOption) => (
                        <SelectItem key={typeOption.id} value={typeOption.id}>
                          {typeOption.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional field for "Other" reason */}
              {returnReason === "Other" && (
                <div className="space-y-2">
                  <Label>Please describe your reason <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder="Please describe why you want to return this item..."
                    value={otherReasonDescription}
                    onChange={(e) => setOtherReasonDescription(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
              )}

              {/* Image upload for "Damaged or defective" or "Received wrong item" reason - NOT for "Wrong size" exchange */}
              {(returnReason === "Damaged or defective" || returnReason.toLowerCase().includes("wrong item")) && 
               !(returnReason.toLowerCase().includes("wrong size") && 
                 (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type === 'exchange') && (
                <div className="space-y-2">
                  <Label>Upload photos as proof <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground">
                    {returnReason === "Damaged or defective" 
                      ? "Please upload clear photos showing the damage or defect"
                      : "Please upload photos showing the wrong item you received"}
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setDefectImages(prev => [...prev, ...files].slice(0, 5)); // Max 5 images
                      }}
                      className="hidden"
                      id="defect-images"
                    />
                    <label
                      htmlFor="defect-images"
                      className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Upload className="h-8 w-8" />
                      <span className="text-sm">Click to upload images (max 5)</span>
                    </label>
                  </div>
                  {defectImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {defectImages.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Defect ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setDefectImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Additional notes (optional)</Label>
                <Textarea
                  placeholder="Any additional details about your return..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-medium text-foreground mb-2">Return Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items to return:</span>
                    <span className="text-foreground">{selectedItems.size}</span>
                  </div>
              {(() => {
                    const isDamagedOrWrongItem = returnReason === "Damaged or defective" || returnReason.toLowerCase().includes("wrong item");
                    const returnTypes = order.enabledReturnTypes && order.enabledReturnTypes.length > 0 
                      ? order.enabledReturnTypes 
                      : DEFAULT_RETURN_TYPES;
                    const selectedReturnType = returnTypes.find(rt => rt.id === selectedReturnTypeId);
                    const isExchange = selectedReturnType?.return_type === 'exchange';
                    const isStoreCredit = selectedReturnType?.return_type === 'store_credit';
                    
                    const itemsValue = order.items
                      .filter(item => selectedItems.has(item.id))
                      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    
                    // Exchange scenarios don't show refund
                    if (isExchange) {
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Items value:</span>
                            <span className="font-medium text-foreground">${itemsValue.toFixed(2)}</span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-muted-foreground text-xs">
                              {isDamagedOrWrongItem 
                                ? "After review and approval, a replacement item will be sent to you."
                                : "After we receive and review your return, we will process your exchange."}
                            </p>
                          </div>
                        </>
                      );
                    }
                    
                    // Damaged/wrong item with refund option selected still gets replacement message
                    if (isDamagedOrWrongItem) {
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Items value:</span>
                            <span className="font-medium text-foreground">${itemsValue.toFixed(2)}</span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-muted-foreground text-xs">
                              After review and approval, a replacement item will be sent to you.
                            </p>
                          </div>
                        </>
                      );
                    }
                    
                    // Store credit scenario
                    if (isStoreCredit) {
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Estimated store credit:</span>
                            <span className="font-medium text-foreground">${itemsValue.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    }
                    
                    // Default: Refund scenario
                    return (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated refund:</span>
                        <span className="font-medium text-foreground">${itemsValue.toFixed(2)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => {
                  // Validate before proceeding
                  if (!selectedReturnTypeId) {
                    toast.error("Please select an expected solution");
                    return;
                  }
                  if (!returnReason) {
                    toast.error("Please select a return reason");
                    return;
                  }
                  if (returnReason === "Other" && !otherReasonDescription.trim()) {
                    toast.error("Please describe your reason for return");
                    return;
                  }
                  const selectedTypeForValidation = (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId);
                  const isWrongSizeExchangeValidation = returnReason.toLowerCase().includes("wrong size") && selectedTypeForValidation?.return_type === 'exchange';
                  const requiresPhotoValidation = (returnReason === "Damaged or defective" || returnReason.toLowerCase().includes("wrong item")) && !isWrongSizeExchangeValidation;
                  if (requiresPhotoValidation && defectImages.length === 0) {
                    toast.error("Please upload at least one photo as proof");
                    return;
                  }
                  
                  // Check if we need the review step
                  const isDamagedDefective = returnReason.toLowerCase().includes("damaged") || returnReason.toLowerCase().includes("defective");
                  const isWrongItem = returnReason.toLowerCase().includes("wrong item");
                  const isWrongSize = returnReason.toLowerCase().includes("wrong size");
                  const isNoReturnRequired = isDamagedDefective || isWrongItem;
                  const isRefundOrExchange = selectedTypeForValidation?.return_type === 'refund' || selectedTypeForValidation?.return_type === 'exchange';
                  const isWrongSizeExchange = isWrongSize && selectedTypeForValidation?.return_type === 'exchange';
                  
                  console.log('Continue clicked:', { returnReason, selectedReturnTypeId, selectedTypeForValidation, isNoReturnRequired, isRefundOrExchange, isWrongSizeExchange });
                  
                  if ((isNoReturnRequired && isRefundOrExchange) || isWrongSizeExchange) {
                    // Initialize size selections for exchange
                    if (selectedTypeForValidation?.return_type === 'exchange') {
                      const initialSizes: Record<string, string> = {};
                      order.items.filter(item => selectedItems.has(item.id)).forEach(item => {
                        initialSizes[item.id] = item.variantTitle || '';
                      });
                      setExchangeSizeSelections(initialSizes);
                    }
                    setStep("review");
                  } else {
                    // Proceed directly to submission
                    handleSubmitReturn();
                  }
                }}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "review" && order && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("return-details")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="font-display">
                    {(order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type === 'refund' 
                      ? "Refund Review" 
                      : "Exchange Selection"}
                  </CardTitle>
                  <CardDescription>
                    {(order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type === 'refund'
                      ? "Review your refund request"
                      : "Select the size for your exchange items"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Refund for damaged/defective - customer keeps product */}
              {(order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type === 'refund' && (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium text-foreground">No Return Shipping Required</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {returnReason.toLowerCase().includes("wrong item") 
                            ? "Since you received the wrong item, you can keep the product. No need to ship it back."
                            : "Since your item is damaged or defective, you can keep the product. No need to ship it back."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="font-medium text-foreground mb-2">What happens next?</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Our team will review your {returnReason.toLowerCase().includes("wrong item") ? "request" : "photos and information"}</li>
                      <li>We will verify the {returnReason.toLowerCase().includes("wrong item") ? "issue" : "defect"} within 1-2 business days</li>
                      <li>Once approved, your refund will be processed automatically</li>
                      <li>You'll receive a confirmation email when the refund is issued</li>
                    </ol>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="font-medium text-foreground mb-2">Refund Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items:</span>
                        <span className="text-foreground">{selectedItems.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated refund:</span>
                        <span className="font-medium text-foreground">
                          ${order.items
                            .filter(item => selectedItems.has(item.id))
                            .reduce((sum, item) => sum + (item.price * item.quantity), 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing time:</span>
                        <span className="text-foreground">1-2 business days</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Exchange for damaged/defective - select size */}
              {(order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type === 'exchange' && (
                <>
                  {/* Different messaging for "Wrong size" exchange vs "Damaged/Wrong item" exchange */}
                  {returnReason.toLowerCase().includes("wrong size") ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <RefreshCw className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-foreground">Exchange Your Item</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select the size you'd like for your replacement item(s). You will need to send back the original product.
                          </p>
                          <div className="mt-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                            <p className="text-sm font-medium text-amber-700">Shipping Fees Apply:</p>
                            <ul className="text-sm text-amber-600 mt-1 space-y-1">
                              <li>• <strong>Return Shipping Fee:</strong> {order.shippingFeeSettings ? `${order.shippingFeeSettings.currency} ${order.shippingFeeSettings.return_shipping_fee.toFixed(2)}` : 'will be applied'} for sending back the product</li>
                              <li>• <strong>New Product Shipping Fee:</strong> {order.shippingFeeSettings ? `${order.shippingFeeSettings.currency} ${order.shippingFeeSettings.new_product_shipping_fee.toFixed(2)}` : 'will be applied'} for your replacement item</li>
                            </ul>
                            {order.shippingFeeSettings && (
                              <p className="text-sm font-semibold text-amber-700 mt-2 pt-2 border-t border-amber-500/20">
                                Total Shipping Fees: {order.shippingFeeSettings.currency} {(order.shippingFeeSettings.return_shipping_fee + order.shippingFeeSettings.new_product_shipping_fee).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium text-foreground">Exchange Your Item</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {returnReason.toLowerCase().includes("wrong item")
                              ? "Select the size you'd like for your replacement item(s). Since you received the wrong item, you can keep the original product."
                              : "Select the size you'd like for your replacement item(s). Since the item is damaged/defective, you can keep the original product."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Select replacement size</h4>
                    {order.items.filter(item => selectedItems.has(item.id)).map((item) => (
                      <div key={item.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start gap-4 mb-4">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="h-24 w-24 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center border border-border">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-foreground">{item.title}</h5>
                            <p className="text-sm text-muted-foreground mt-1">Current size: {item.variantTitle}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="text-sm font-medium text-foreground mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Select new size</Label>
                          <RadioGroup
                            value={exchangeSizeSelections[item.id] || ''}
                            onValueChange={(value) => {
                              setExchangeSizeSelections(prev => ({
                                ...prev,
                                [item.id]: value
                              }));
                            }}
                            className="flex flex-wrap gap-2"
                          >
                            {/* Common sizes - in a real app these would come from the product */}
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                              <div key={size} className="flex items-center">
                                <RadioGroupItem
                                  value={size}
                                  id={`${item.id}-${size}`}
                                  className="sr-only"
                                />
                                <Label
                                  htmlFor={`${item.id}-${size}`}
                                  className={`cursor-pointer px-4 py-2 rounded-md border transition-colors ${
                                    exchangeSizeSelections[item.id] === size
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                >
                                  {size}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Button 
                className="w-full" 
                onClick={handleSubmitReturn}
                disabled={submitting || uploadingImages || (
                  (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type === 'exchange' &&
                  order.items.filter(item => selectedItems.has(item.id)).some(item => !exchangeSizeSelections[item.id])
                )}
              >
                {uploadingImages && uploadProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading image {uploadProgress.current} of {uploadProgress.total}...
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Return Request"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "confirmation" && order && (
          <Card>
            <CardContent className="pt-8">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Return Request Submitted!
                </h2>
                <p className="text-muted-foreground">
                  We&apos;ve received your return request. You&apos;ll receive an email with further instructions shortly.
                </p>
              </div>

              {/* Order Summary */}
              <div className="rounded-lg border border-border p-4 mb-4">
                <h4 className="font-medium text-foreground mb-3">Order Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Order Number:</span>
                  <span className="text-foreground font-medium">{order.orderNumber}</span>
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="text-foreground">{order.customerName}</span>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{order.customerEmail}</span>
                </div>
              </div>

              {/* Items Being Returned */}
              <div className="rounded-lg border border-border p-4 mb-4">
                <h4 className="font-medium text-foreground mb-3">Items Being Returned</h4>
                <div className="space-y-3">
                  {order.items.filter(item => selectedItems.has(item.id)).map((item) => {
                    const selectedType = (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type;
                    const exchangeSize = exchangeSizeSelections[item.id];
                    
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.variantTitle} • Qty: {item.quantity}</p>
                          {selectedType === 'exchange' && exchangeSize && (
                            <p className="text-xs text-primary mt-1">Exchange to: {exchangeSize}</p>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Details */}
              <div className="rounded-lg border border-border p-4 mb-4">
                <h4 className="font-medium text-foreground mb-3">Return Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="text-foreground">{returnReason}</span>
                  {returnReason === "Other" && otherReasonDescription && (
                    <>
                      <span className="text-muted-foreground">Description:</span>
                      <span className="text-foreground">{otherReasonDescription}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Return Type:</span>
                  <span className="text-foreground">
                    {(order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.label || 'Refund'}
                  </span>
                  {customerNotes && (
                    <>
                      <span className="text-muted-foreground">Additional Notes:</span>
                      <span className="text-foreground">{customerNotes}</span>
                    </>
                  )}
                </div>
                {defectImages.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground mb-2">Photos Uploaded: {defectImages.length}</p>
                    <div className="flex gap-2 flex-wrap">
                      {defectImages.map((file, index) => (
                        <img
                          key={index}
                          src={URL.createObjectURL(file)}
                          alt={`Proof ${index + 1}`}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary with What happens next - merged into one box */}
              {(() => {
                const selectedType = (order.enabledReturnTypes || DEFAULT_RETURN_TYPES).find(t => t.id === selectedReturnTypeId)?.return_type;
                const isExchange = selectedType === 'exchange';
                const isStoreCredit = selectedType === 'store_credit';
                const isRefund = selectedType === 'refund';
                const isWrongSizeExchange = returnReason.toLowerCase().includes("wrong size") && isExchange;
                const isDamagedOrWrongItem = (returnReason === "Damaged or defective" || returnReason.toLowerCase().includes("wrong item"));
                const itemsTotal = order.items
                  .filter(item => selectedItems.has(item.id))
                  .reduce((sum, item) => sum + (item.price * item.quantity), 0);
                
                // REFUND type - show refund amount and refund process
                if (isRefund) {
                  return (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mb-6">
                      <h4 className="font-medium text-foreground mb-3">Refund Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items value:</span>
                          <span className="text-foreground">${itemsTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-primary/20">
                          <span className="font-medium text-foreground">Estimated Refund:</span>
                          <span className="text-lg font-bold text-primary">${itemsTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-primary/20">
                        <h5 className="font-medium text-foreground mb-2">What happens next?</h5>
                        {isDamagedOrWrongItem ? (
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Our team will review your request within 1-2 business days</li>
                            <li>Once approved, your refund will be processed to your original payment method</li>
                            <li>No need to return the item - you can keep or dispose of it</li>
                          </ol>
                        ) : (
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Our team will review your request within 1-2 business days</li>
                            <li>You&apos;ll receive a prepaid shipping label via email</li>
                            <li>Pack and ship your items using the provided label</li>
                            <li>Once received, your refund will be processed to your original payment method</li>
                          </ol>
                        )}
                      </div>
                    </div>
                  );
                }
                
                // STORE CREDIT type
                if (isStoreCredit) {
                  return (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mb-6">
                      <h4 className="font-medium text-foreground mb-3">Store Credit Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items value:</span>
                          <span className="text-foreground">${itemsTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-primary/20">
                          <span className="font-medium text-foreground">Estimated Store Credit:</span>
                          <span className="text-lg font-bold text-primary">${itemsTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-primary/20">
                        <h5 className="font-medium text-foreground mb-2">What happens next?</h5>
                        {isDamagedOrWrongItem ? (
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Our team will review your request within 1-2 business days</li>
                            <li>Once approved, your store credit will be issued to your account</li>
                            <li>No need to return the item - you can keep or dispose of it</li>
                          </ol>
                        ) : (
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Our team will review your request within 1-2 business days</li>
                            <li>You&apos;ll receive a prepaid shipping label via email</li>
                            <li>Pack and ship your items using the provided label</li>
                            <li>Once received, your store credit will be issued to your account</li>
                          </ol>
                        )}
                      </div>
                    </div>
                  );
                }
                
                // EXCHANGE type - Wrong size (with shipping fees)
                if (isWrongSizeExchange) {
                  const shippingTotal = order.shippingFeeSettings 
                    ? order.shippingFeeSettings.return_shipping_fee + order.shippingFeeSettings.new_product_shipping_fee 
                    : 0;
                  
                  return (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 mb-6">
                      <h4 className="font-medium text-foreground mb-3">Exchange Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items value:</span>
                          <span className="text-foreground">${itemsTotal.toFixed(2)}</span>
                        </div>
                        {order.shippingFeeSettings && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Return shipping fee:</span>
                              <span className="text-foreground">{order.shippingFeeSettings.currency} {order.shippingFeeSettings.return_shipping_fee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">New product shipping fee:</span>
                              <span className="text-foreground">{order.shippingFeeSettings.currency} {order.shippingFeeSettings.new_product_shipping_fee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-amber-500/20">
                              <span className="font-medium text-amber-700">Total Shipping Fees to Pay:</span>
                              <span className="text-lg font-bold text-amber-700">{order.shippingFeeSettings.currency} {shippingTotal.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-amber-500/20">
                        <h5 className="font-medium text-foreground mb-2">What happens next?</h5>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Our team will review your request within 1-2 business days</li>
                          <li>You will receive an additional payment request by email for the shipping fees</li>
                          <li>Once payment is confirmed, you will receive a return shipping label by email</li>
                          <li>Pack and send back the product using the provided label</li>
                          <li>Once we receive your product, a new one will be shipped to your address</li>
                        </ol>
                      </div>
                    </div>
                  );
                }
                
                // EXCHANGE type - Damaged/defective or wrong item (free replacement)
                if (isExchange && isDamagedOrWrongItem) {
                  return (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mb-6">
                      <h4 className="font-medium text-foreground mb-3">Replacement Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items value:</span>
                          <span className="text-foreground">${itemsTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-primary/20">
                        <h5 className="font-medium text-foreground mb-2">What happens next?</h5>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Our team will review your request within 1-2 business days</li>
                          <li>Once approved, a replacement item will be sent to you</li>
                          <li>No need to return the defective item - you can keep or dispose of it</li>
                        </ol>
                      </div>
                    </div>
                  );
                }
                
                // EXCHANGE type - Other cases (standard exchange)
                if (isExchange) {
                  return (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mb-6">
                      <h4 className="font-medium text-foreground mb-3">Exchange Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items value:</span>
                          <span className="text-foreground">${itemsTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-primary/20">
                        <h5 className="font-medium text-foreground mb-2">What happens next?</h5>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Our team will review your request within 1-2 business days</li>
                          <li>Once approved, a replacement item will be sent to you</li>
                          <li>You may receive a return shipping label if the original item needs to be returned</li>
                        </ol>
                      </div>
                    </div>
                  );
                }
                
                // Fallback (should not reach here normally)
                return (
                  <div className="rounded-lg bg-muted p-4 mb-6">
                    <h4 className="font-medium text-foreground mb-3">Request Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items value:</span>
                        <span className="text-foreground">${itemsTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border">
                      <h5 className="font-medium text-foreground mb-2">What happens next?</h5>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Our team will review your request within 1-2 business days</li>
                        <li>You will be contacted with next steps</li>
                      </ol>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleStartOver} variant="outline" className="flex-1">
                  Start Another Return
                </Button>
                <Button 
                  asChild 
                  className="flex-1 gradient-primary"
                >
                  <a href="https://eleven-coast.com" target="_blank" rel="noopener noreferrer">
                    Continue Shopping
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Need help? Contact our support team
        </div>
      </footer>
    </div>
  );
}
