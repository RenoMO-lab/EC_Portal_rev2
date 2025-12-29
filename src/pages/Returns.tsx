import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Search, Plus, Filter, Package, RefreshCw, MoreHorizontal, Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  created_at: string;
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

export default function Returns() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<string | null>(null);
  const [newReturn, setNewReturn] = useState<{
    order_id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    return_type: 'refund' | 'exchange' | 'store_credit';
    reason: string;
    original_amount: string;
  }>({
    order_id: '',
    order_number: '',
    customer_name: '',
    customer_email: '',
    return_type: 'refund',
    reason: '',
    original_amount: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchReturns();
    }
  }, [user, statusFilter, typeFilter]);

  const fetchReturns = async () => {
    try {
      let query = supabase
        .from('return_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as ReturnRequest['status']);
      }
      if (typeFilter !== 'all') {
        query = query.eq('return_type', typeFilter as ReturnRequest['return_type']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReturns((data || []) as ReturnRequest[]);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Failed to fetch returns');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateReturn = async () => {
    try {
      const { error } = await supabase.from('return_requests').insert({
        user_id: user?.id,
        order_id: newReturn.order_id,
        order_number: newReturn.order_number,
        customer_name: newReturn.customer_name,
        customer_email: newReturn.customer_email,
        return_type: newReturn.return_type,
        reason: newReturn.reason,
        original_amount: parseFloat(newReturn.original_amount),
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Return request created');
      setIsCreateDialogOpen(false);
      setNewReturn({
        order_id: '',
        order_number: '',
        customer_name: '',
        customer_email: '',
        return_type: 'refund',
        reason: '',
        original_amount: '',
      });
      fetchReturns();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return request');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      toast.success('Return request approved');
      fetchReturns();
    } catch (error) {
      toast.error('Failed to approve return');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Return request rejected');
      fetchReturns();
    } catch (error) {
      toast.error('Failed to reject return');
    }
  };

  const handleDelete = async () => {
    if (!returnToDelete) return;
    
    try {
      // First delete related return items
      const { error: itemsError } = await supabase
        .from('return_items')
        .delete()
        .eq('return_request_id', returnToDelete);

      if (itemsError) throw itemsError;

      // Then delete the return request
      const { error } = await supabase
        .from('return_requests')
        .delete()
        .eq('id', returnToDelete);

      if (error) throw error;
      
      toast.success('Return request deleted');
      setDeleteDialogOpen(false);
      setReturnToDelete(null);
      fetchReturns();
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('Failed to delete return request');
    }
  };

  const openDeleteDialog = (id: string) => {
    setReturnToDelete(id);
    setDeleteDialogOpen(true);
  };

  const filteredReturns = returns.filter((r) =>
    r.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Returns</h1>
            <p className="text-muted-foreground">Manage all return and exchange requests</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Return
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Return Request</DialogTitle>
                <DialogDescription>
                  Manually create a new return or exchange request
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order ID</Label>
                    <Input
                      value={newReturn.order_id}
                      onChange={(e) => setNewReturn({ ...newReturn, order_id: e.target.value })}
                      placeholder="order_123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order Number</Label>
                    <Input
                      value={newReturn.order_number}
                      onChange={(e) => setNewReturn({ ...newReturn, order_number: e.target.value })}
                      placeholder="1001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input
                      value={newReturn.customer_name}
                      onChange={(e) => setNewReturn({ ...newReturn, customer_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Email</Label>
                    <Input
                      type="email"
                      value={newReturn.customer_email}
                      onChange={(e) => setNewReturn({ ...newReturn, customer_email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Return Type</Label>
                    <Select
                      value={newReturn.return_type}
                      onValueChange={(value) =>
                        setNewReturn({ ...newReturn, return_type: value as 'refund' | 'exchange' | 'store_credit' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="exchange">Exchange</SelectItem>
                        <SelectItem value="store_credit">Store Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Original Amount</Label>
                    <Input
                      type="number"
                      value={newReturn.original_amount}
                      onChange={(e) => setNewReturn({ ...newReturn, original_amount: e.target.value })}
                      placeholder="99.99"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={newReturn.reason}
                    onChange={(e) => setNewReturn({ ...newReturn, reason: e.target.value })}
                    placeholder="Reason for return..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReturn} className="gradient-primary">
                  Create Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="exchange">Exchange</SelectItem>
              <SelectItem value="store_credit">Store Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border shadow-soft">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px]">Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Package className="w-8 h-8" />
                          <p>No return requests found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturns.map((returnRequest) => (
                      <TableRow key={returnRequest.id}>
                        <TableCell className="font-medium">#{returnRequest.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{returnRequest.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{returnRequest.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('font-medium', typeConfig[returnRequest.return_type].className)}>
                            {typeConfig[returnRequest.return_type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('font-medium', statusConfig[returnRequest.status].className)}>
                            {statusConfig[returnRequest.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{returnRequest.reason}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${returnRequest.original_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(returnRequest.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/returns/${returnRequest.id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {returnRequest.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApprove(returnRequest.id)}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleReject(returnRequest.id)} className="text-destructive">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(returnRequest.id)} 
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Return Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this return request? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
