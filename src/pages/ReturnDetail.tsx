import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays } from 'date-fns';
import { ArrowLeft, RefreshCw, Package, User, Mail, Calendar, DollarSign, MessageSquare, Image as ImageIcon, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ReturnRequest {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  return_type: 'refund' | 'exchange' | 'store_credit';
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'shipped' | 'received' | 'completed' | 'cancelled';
  original_amount: number;
  refund_amount: number | null;
  reason: string;
  customer_notes: string | null;
  merchant_notes: string | null;
  other_reason_description: string | null;
  defect_image_urls: string[] | null;
  policy_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ReturnPolicy {
  id: string;
  name: string;
  return_window_days: number;
  return_window_start: 'fulfilled' | 'delivered';
}

interface ReturnItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  product_image_url: string | null;
  product_sku: string | null;
  exchange_product_id: string | null;
  exchange_product_name: string | null;
  exchange_variant_id: string | null;
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  processing: { label: 'Processing', className: 'bg-info/10 text-info border-info/20' },
  shipped: { label: 'Shipped', className: 'bg-primary/10 text-primary border-primary/20' },
  received: { label: 'Received', className: 'bg-success/10 text-success border-success/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-muted' },
};

const typeConfig = {
  refund: { label: 'Refund', className: 'bg-primary/10 text-primary border-primary/20' },
  exchange: { label: 'Exchange', className: 'bg-accent text-accent-foreground border-accent' },
  store_credit: { label: 'Store Credit', className: 'bg-success/10 text-success border-success/20' },
};

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnPolicy, setReturnPolicy] = useState<ReturnPolicy | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchReturnDetails();
    }
  }, [user, id]);

  const fetchReturnDetails = async () => {
    try {
      const { data: request, error: requestError } = await supabase
        .from('return_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (requestError) throw requestError;
      setReturnRequest(request as ReturnRequest);

      // Fetch policy if exists
      if (request.policy_id) {
        const { data: policy } = await supabase
          .from('return_policies')
          .select('id, name, return_window_days, return_window_start')
          .eq('id', request.policy_id)
          .maybeSingle();
        
        if (policy) {
          setReturnPolicy(policy as ReturnPolicy);
        }
      }

      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_request_id', id);

      if (itemsError) throw itemsError;
      setReturnItems(items as ReturnItem[]);
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error('Failed to fetch return details');
    } finally {
      setLoadingData(false);
    }
  };

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      toast.success('Return request approved');
      fetchReturnDetails();
    } catch (error) {
      toast.error('Failed to approve return');
    }
  };

  const handleReject = async () => {
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Return request rejected');
      fetchReturnDetails();
    } catch (error) {
      toast.error('Failed to reject return');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  if (!returnRequest) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Package className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Return request not found</p>
          <Button variant="outline" onClick={() => navigate('/returns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Returns
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/returns')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Return #{returnRequest.order_number}</h1>
              <p className="text-muted-foreground">View and manage return request details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className={cn('font-medium', typeConfig[returnRequest.return_type].className)}>
              {typeConfig[returnRequest.return_type].label}
            </Badge>
            <Badge variant="outline" className={cn('font-medium', statusConfig[returnRequest.status].className)}>
              {statusConfig[returnRequest.status].label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{returnRequest.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{returnRequest.customer_email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Return Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Return Items</CardTitle>
              </CardHeader>
              <CardContent>
                {returnItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No items found</p>
                ) : (
                  <div className="space-y-3">
                    {returnItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <div className="flex items-center gap-4">
                          {item.product_image_url ? (
                            <img
                              src={item.product_image_url}
                              alt={item.product_name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            {item.variant_name && (
                              <p className="text-sm text-muted-foreground">Variant: {item.variant_name}</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span>
                                <span className="font-medium">Product ID:</span>{' '}
                                {item.product_id?.replace('gid://shopify/Product/', '') || 'N/A'}
                              </span>
                              {item.variant_id && (
                                <span>
                                  <span className="font-medium">Variant ID:</span>{' '}
                                  {item.variant_id.replace('gid://shopify/ProductVariant/', '')}
                                </span>
                              )}
                              {item.product_sku && (
                                <span>
                                  <span className="font-medium">SKU:</span> {item.product_sku}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(item.unit_price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                        
                        {/* Exchange Details - Show what the customer wants */}
                        {returnRequest?.return_type === 'exchange' && item.exchange_variant_id && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2 text-sm">
                              <RefreshCw className="h-4 w-4 text-primary" />
                              <span className="font-medium text-primary">Exchange Request</span>
                            </div>
                            <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                              <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Product:</span>
                                  <span className="font-medium">{item.exchange_product_name || item.product_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Requested Size:</span>
                                  <span className="font-bold text-primary">{item.exchange_variant_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Quantity:</span>
                                  <span className="font-medium">{item.quantity}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reason & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Return Reason</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">{returnRequest.reason}</p>
                    {returnRequest.reason === "Other" && returnRequest.other_reason_description && (
                      <p className="text-muted-foreground mt-1">{returnRequest.other_reason_description}</p>
                    )}
                  </div>
                </div>

                {returnRequest.customer_notes && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Notes</p>
                        <p className="mt-1">{returnRequest.customer_notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Defect Images */}
            {returnRequest.defect_image_urls && returnRequest.defect_image_urls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Defect Photos
                  </CardTitle>
                  <CardDescription>
                    Photos uploaded by customer showing the damage or defect
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {returnRequest.defect_image_urls.map((url, index) => (
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <button className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer group">
                            <img
                              src={url}
                              alt={`Defect ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl p-2">
                          <img
                            src={url}
                            alt={`Defect ${index + 1}`}
                            className="w-full h-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Amount Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Amount Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Original Amount</span>
                  <span className="font-medium">${returnRequest.original_amount.toFixed(2)}</span>
                </div>
                {returnRequest.refund_amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Refund Amount</span>
                    <span className="font-bold text-lg">${returnRequest.refund_amount.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Return Window Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Return Window
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {returnPolicy ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Policy</span>
                      <span className="font-medium">{returnPolicy.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Window</span>
                      <span className="font-medium">{returnPolicy.return_window_days} days from {returnPolicy.return_window_start === 'fulfilled' ? 'fulfillment' : 'delivery'}</span>
                    </div>
                    {(() => {
                      const requestDate = new Date(returnRequest.created_at);
                      const windowEndDate = new Date(requestDate);
                      windowEndDate.setDate(windowEndDate.getDate() + returnPolicy.return_window_days);
                      const remainingDays = differenceInDays(windowEndDate, new Date());
                      const isExpired = remainingDays < 0;
                      const isUrgent = remainingDays >= 0 && remainingDays <= 3;
                      
                      return (
                        <div className={cn(
                          "p-3 rounded-lg border mt-2",
                          isExpired ? "bg-destructive/10 border-destructive/30" :
                          isUrgent ? "bg-warning/10 border-warning/30" :
                          "bg-success/10 border-success/30"
                        )}>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
                            <p className={cn(
                              "text-2xl font-bold",
                              isExpired ? "text-destructive" :
                              isUrgent ? "text-warning" :
                              "text-success"
                            )}>
                              {isExpired ? 'Expired' : remainingDays}
                            </p>
                            {!isExpired && (
                              <p className="text-xs text-muted-foreground mt-1">
                                until {format(windowEndDate, 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground">
                      Based on request date. Actual window may vary based on {returnPolicy.return_window_start === 'fulfilled' ? 'fulfillment' : 'delivery'} date from Shopify.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No policy assigned to this return request
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium text-sm">{format(new Date(returnRequest.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium text-sm">{format(new Date(returnRequest.updated_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {returnRequest.status === 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" onClick={handleApprove}>
                    Approve Return
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={handleReject}>
                    Reject Return
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
