import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, FileText, Edit2, Trash2, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ReturnPolicy {
  id: string;
  name: string;
  description: string | null;
  return_window_days: number;
  return_window_start: 'fulfilled' | 'delivered';
  allow_exchanges: boolean;
  allow_refunds: boolean;
  allow_store_credit: boolean;
  store_credit_bonus_percent: number | null;
  requires_receipt: boolean;
  requires_original_packaging: boolean;
  restocking_fee_percent: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export default function Policies() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<ReturnPolicy[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ReturnPolicy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    return_window_days: 30,
    return_window_start: 'delivered' as 'fulfilled' | 'delivered',
    allow_exchanges: true,
    allow_refunds: true,
    allow_store_credit: true,
    store_credit_bonus_percent: 0,
    requires_receipt: false,
    requires_original_packaging: false,
    restocking_fee_percent: 0,
    is_default: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPolicies();
    }
  }, [user]);

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('return_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolicies((data || []) as ReturnPolicy[]);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast.error('Failed to fetch policies');
    } finally {
      setLoadingData(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPolicy(null);
    setFormData({
      name: '',
      description: '',
      return_window_days: 30,
      return_window_start: 'delivered',
      allow_exchanges: true,
      allow_refunds: true,
      allow_store_credit: true,
      store_credit_bonus_percent: 0,
      requires_receipt: false,
      requires_original_packaging: false,
      restocking_fee_percent: 0,
      is_default: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (policy: ReturnPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      return_window_days: policy.return_window_days,
      return_window_start: policy.return_window_start || 'delivered',
      allow_exchanges: policy.allow_exchanges,
      allow_refunds: policy.allow_refunds,
      allow_store_credit: policy.allow_store_credit,
      store_credit_bonus_percent: policy.store_credit_bonus_percent || 0,
      requires_receipt: policy.requires_receipt,
      requires_original_packaging: policy.requires_original_packaging,
      restocking_fee_percent: policy.restocking_fee_percent || 0,
      is_default: policy.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingPolicy) {
        const { error } = await supabase
          .from('return_policies')
          .update(formData)
          .eq('id', editingPolicy.id);

        if (error) throw error;
        toast.success('Policy updated');
      } else {
        const { error } = await supabase.from('return_policies').insert({
          ...formData,
          user_id: user?.id,
        });

        if (error) throw error;
        toast.success('Policy created');
      }

      setIsDialogOpen(false);
      fetchPolicies();
    } catch (error) {
      console.error('Error saving policy:', error);
      toast.error('Failed to save policy');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('return_policies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Policy deleted');
      fetchPolicies();
    } catch (error) {
      toast.error('Failed to delete policy');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // First, remove default from all policies
      await supabase
        .from('return_policies')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('return_policies')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Default policy updated');
      fetchPolicies();
    } catch (error) {
      toast.error('Failed to update default policy');
    }
  };

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
            <h1 className="text-2xl font-display font-bold">Return Policies</h1>
            <p className="text-muted-foreground">Configure your return and exchange rules</p>
          </div>
          <Button className="gradient-primary" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            New Policy
          </Button>
        </div>

        {/* Policies Grid */}
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : policies.length === 0 ? (
          <Card className="border shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No policies yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first return policy to get started
              </p>
              <Button className="gradient-primary" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Policy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => (
              <Card key={policy.id} className="border shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-display flex items-center gap-2">
                        {policy.name}
                        {policy.is_default && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {policy.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Return Window</div>
                    <div className="font-medium">{policy.return_window_days} days from {policy.return_window_start === 'fulfilled' ? 'fulfillment' : 'delivery'}</div>
                    
                    <div className="text-muted-foreground">Refunds</div>
                    <div className="font-medium">{policy.allow_refunds ? 'Allowed' : 'Not allowed'}</div>
                    
                    <div className="text-muted-foreground">Exchanges</div>
                    <div className="font-medium">{policy.allow_exchanges ? 'Allowed' : 'Not allowed'}</div>
                    
                    <div className="text-muted-foreground">Store Credit</div>
                    <div className="font-medium">
                      {policy.allow_store_credit
                        ? policy.store_credit_bonus_percent
                          ? `+${policy.store_credit_bonus_percent}% bonus`
                          : 'Allowed'
                        : 'Not allowed'}
                    </div>

                    {policy.restocking_fee_percent ? (
                      <>
                        <div className="text-muted-foreground">Restocking Fee</div>
                        <div className="font-medium">{policy.restocking_fee_percent}%</div>
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(policy)}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {!policy.is_default && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(policy.id)}>
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(policy.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
              <DialogDescription>
                Configure the rules for this return policy
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Policy Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Standard Return Policy"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when this policy applies..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Return Window (days)</Label>
                  <Input
                    type="number"
                    value={formData.return_window_days}
                    onChange={(e) => setFormData({ ...formData, return_window_days: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Window Starts From</Label>
                  <select
                    value={formData.return_window_start}
                    onChange={(e) => setFormData({ ...formData, return_window_start: e.target.value as 'fulfilled' | 'delivered' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="delivered">Delivered</option>
                    <option value="fulfilled">Fulfilled</option>
                  </select>
                  <p className="text-xs text-muted-foreground">When the return window countdown begins</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Return Options</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Refunds</Label>
                    <p className="text-sm text-muted-foreground">Enable refunds to original payment</p>
                  </div>
                  <Switch
                    checked={formData.allow_refunds}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_refunds: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Exchanges</Label>
                    <p className="text-sm text-muted-foreground">Enable product exchanges</p>
                  </div>
                  <Switch
                    checked={formData.allow_exchanges}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_exchanges: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Store Credit</Label>
                    <p className="text-sm text-muted-foreground">Enable store credit option</p>
                  </div>
                  <Switch
                    checked={formData.allow_store_credit}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_store_credit: checked })}
                  />
                </div>
                {formData.allow_store_credit && (
                  <div className="space-y-2 pl-4">
                    <Label>Store Credit Bonus (%)</Label>
                    <Input
                      type="number"
                      value={formData.store_credit_bonus_percent}
                      onChange={(e) => setFormData({ ...formData, store_credit_bonus_percent: parseFloat(e.target.value) })}
                      placeholder="10"
                    />
                    <p className="text-xs text-muted-foreground">Bonus percentage added to store credit refunds</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Requirements</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requires Receipt</Label>
                    <p className="text-sm text-muted-foreground">Customer must provide proof of purchase</p>
                  </div>
                  <Switch
                    checked={formData.requires_receipt}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_receipt: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requires Original Packaging</Label>
                    <p className="text-sm text-muted-foreground">Item must be in original packaging</p>
                  </div>
                  <Switch
                    checked={formData.requires_original_packaging}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_original_packaging: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Restocking Fee (%)</Label>
                <Input
                  type="number"
                  value={formData.restocking_fee_percent}
                  onChange={(e) => setFormData({ ...formData, restocking_fee_percent: parseFloat(e.target.value) })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">Percentage deducted from refund amount</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="gradient-primary">
                {editingPolicy ? 'Save Changes' : 'Create Policy'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
