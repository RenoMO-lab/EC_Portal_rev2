import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreHorizontal, Eye, CheckCircle, XCircle, Package, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReturnRequest {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  return_type: 'refund' | 'exchange' | 'store_credit';
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'shipped' | 'received' | 'completed' | 'cancelled';
  original_amount: number;
  reason: string;
  created_at: string;
}

interface ReturnsTableProps {
  returns: ReturnRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
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

export default function ReturnsTable({ returns, onApprove, onReject, onView, onDelete }: ReturnsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<string | null>(null);

  const openDeleteDialog = (id: string) => {
    setReturnToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (returnToDelete && onDelete) {
      onDelete(returnToDelete);
    }
    setDeleteDialogOpen(false);
    setReturnToDelete(null);
  };

  return (
    <>
      <Card className="border shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display">Recent Returns</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="w-8 h-8" />
                        <p>No return requests yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((returnRequest) => (
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
                            <DropdownMenuItem onClick={() => onView?.(returnRequest.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {returnRequest.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => onApprove?.(returnRequest.id)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onReject?.(returnRequest.id)} className="text-destructive">
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
            <Button variant="destructive" onClick={handleConfirmDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
