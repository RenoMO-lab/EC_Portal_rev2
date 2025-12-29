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
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Zap, Edit2, Trash2, RefreshCw, Power, PlayCircle, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  conditions: any[];
  actions: any[];
  is_active: boolean;
  created_at: string;
}

const triggerTypes = [
  { value: 'return_created', label: 'Return Request Created' },
  { value: 'return_updated', label: 'Return Request Updated' },
  { value: 'return_received', label: 'Return Item Received' },
  { value: 'low_value_return', label: 'Low Value Return' },
  { value: 'high_value_return', label: 'High Value Return' },
  { value: 'repeat_customer', label: 'Repeat Customer Return' },
];

const actionTypes = [
  { value: 'auto_approve', label: 'Auto-approve return' },
  { value: 'send_email', label: 'Send email notification' },
  { value: 'apply_store_credit', label: 'Apply store credit bonus' },
  { value: 'flag_for_review', label: 'Flag for manual review' },
  { value: 'generate_label', label: 'Generate return label' },
];

export default function Automation() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'return_created',
    is_active: true,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRules();
    }
  }, [user]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules((data || []) as AutomationRule[]);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Failed to fetch automation rules');
    } finally {
      setLoadingData(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      trigger_type: 'return_created',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: AutomationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      is_active: rule.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        const { error } = await supabase
          .from('automation_rules')
          .update(formData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Rule updated');
      } else {
        const { error } = await supabase.from('automation_rules').insert({
          ...formData,
          user_id: user?.id,
          conditions: [],
          actions: [],
        });

        if (error) throw error;
        toast.success('Rule created');
      }

      setIsDialogOpen(false);
      fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save rule');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Rule deleted');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(isActive ? 'Rule paused' : 'Rule activated');
      fetchRules();
    } catch (error) {
      toast.error('Failed to update rule');
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
            <h1 className="text-2xl font-display font-bold">Automation</h1>
            <p className="text-muted-foreground">Set up smart rules to automate return processing</p>
          </div>
          <Button className="gradient-primary" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border shadow-soft bg-gradient-to-r from-primary/5 to-accent/50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Smart Automation</h3>
              <p className="text-sm text-muted-foreground">
                Automatically approve returns, send notifications, or flag items for review based on your rules
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <Card className="border shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No automation rules yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first automation rule to streamline returns processing
              </p>
              <Button className="gradient-primary" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.id} className="border shadow-soft hover:shadow-medium transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2.5 rounded-xl ${rule.is_active ? 'bg-success/10' : 'bg-muted'}`}>
                        {rule.is_active ? (
                          <PlayCircle className={`w-5 h-5 text-success`} />
                        ) : (
                          <PauseCircle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-semibold">{rule.name}</h3>
                          <Badge
                            variant="outline"
                            className={rule.is_active ? 'bg-success/10 text-success border-success/20' : ''}
                          >
                            {rule.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">
                            {triggerTypes.find((t) => t.value === rule.trigger_type)?.label || rule.trigger_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleActive(rule.id, rule.is_active)}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(rule)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Automation Rule'}</DialogTitle>
              <DialogDescription>
                Configure when and how this automation should run
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Auto-approve low value returns"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this rule does..."
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Enable this automation rule</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="gradient-primary">
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
