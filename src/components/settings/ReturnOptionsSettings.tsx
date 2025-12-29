import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReturnReason {
  id: string;
  reason: string;
  is_active: boolean;
  sort_order: number;
}

interface ReturnTypeOption {
  id: string;
  label: string;
  description: string | null;
  return_type: string;
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_REASONS = [
  "Wrong size",
  "Wrong color", 
  "Damaged or defective",
  "Changed my mind",
  "Received wrong item",
  "Quality not as expected",
  "Other"
];

const DEFAULT_RETURN_TYPES = [
  { label: 'Refund to original payment', description: 'Customer receives money back to their original payment method', return_type: 'refund' },
  { label: 'Exchange for another item', description: 'Customer can swap for a different product', return_type: 'exchange' },
  { label: 'Store credit', description: 'Customer receives credit to use on future purchases', return_type: 'store_credit' },
];

export default function ReturnOptionsSettings() {
  const { user } = useAuth();
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [returnTypes, setReturnTypes] = useState<ReturnTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState('refund');
  
  // Edit states for return types
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeLabel, setEditTypeLabel] = useState('');
  const [editTypeDescription, setEditTypeDescription] = useState('');
  const [editTypeCategory, setEditTypeCategory] = useState('refund');
  
  // Edit states for reasons
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [editReasonText, setEditReasonText] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [reasonsRes, typesRes] = await Promise.all([
        supabase
          .from('return_reasons')
          .select('*')
          .eq('user_id', user?.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('return_type_options')
          .select('*')
          .eq('user_id', user?.id)
          .order('sort_order', { ascending: true })
      ]);

      if (reasonsRes.error) throw reasonsRes.error;
      if (typesRes.error) throw typesRes.error;

      if (reasonsRes.data && reasonsRes.data.length > 0) {
        setReasons(reasonsRes.data);
      } else {
        await initializeDefaultReasons();
      }

      if (typesRes.data && typesRes.data.length > 0) {
        setReturnTypes(typesRes.data);
      } else {
        await initializeDefaultReturnTypes();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultReasons = async () => {
    if (!user) return;
    
    const reasonsToInsert = DEFAULT_REASONS.map((reason, index) => ({
      user_id: user.id,
      reason,
      is_active: true,
      sort_order: index,
    }));

    const { data, error } = await supabase
      .from('return_reasons')
      .insert(reasonsToInsert)
      .select();

    if (error) {
      console.error('Error initializing reasons:', error);
      return;
    }

    if (data) {
      setReasons(data);
    }
  };

  const initializeDefaultReturnTypes = async () => {
    if (!user) return;
    
    const typesToInsert = DEFAULT_RETURN_TYPES.map((type, index) => ({
      user_id: user.id,
      label: type.label,
      description: type.description,
      return_type: type.return_type,
      is_active: true,
      sort_order: index,
    }));

    const { data, error } = await supabase
      .from('return_type_options')
      .insert(typesToInsert)
      .select();

    if (error) {
      console.error('Error initializing return types:', error);
      return;
    }

    if (data) {
      setReturnTypes(data);
    }
  };

  const handleAddReason = async () => {
    if (!newReason.trim() || !user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('return_reasons')
        .insert({
          user_id: user.id,
          reason: newReason.trim(),
          is_active: true,
          sort_order: reasons.length,
        })
        .select()
        .single();

      if (error) throw error;

      setReasons([...reasons, data]);
      setNewReason('');
      toast.success('Return reason added');
    } catch (error) {
      console.error('Error adding reason:', error);
      toast.error('Failed to add return reason');
    } finally {
      setSaving(false);
    }
  };

  const handleAddReturnType = async () => {
    if (!newTypeLabel.trim() || !user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('return_type_options')
        .insert({
          user_id: user.id,
          label: newTypeLabel.trim(),
          description: newTypeDescription.trim() || null,
          return_type: newTypeCategory,
          is_active: true,
          sort_order: returnTypes.length,
        })
        .select()
        .single();

      if (error) throw error;

      setReturnTypes([...returnTypes, data]);
      setNewTypeLabel('');
      setNewTypeDescription('');
      setNewTypeCategory('refund');
      toast.success('Return option added');
    } catch (error) {
      console.error('Error adding return type:', error);
      toast.error('Failed to add return option');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReason = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('return_reasons')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setReasons(reasons.map(r => r.id === id ? { ...r, is_active: isActive } : r));
    } catch (error) {
      console.error('Error updating reason:', error);
      toast.error('Failed to update reason');
    }
  };

  const handleToggleReturnType = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('return_type_options')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setReturnTypes(returnTypes.map(t => t.id === id ? { ...t, is_active: isActive } : t));
    } catch (error) {
      console.error('Error updating return type:', error);
      toast.error('Failed to update return option');
    }
  };

  const handleDeleteReason = async (id: string) => {
    try {
      const { error } = await supabase
        .from('return_reasons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReasons(reasons.filter(r => r.id !== id));
      toast.success('Return reason deleted');
    } catch (error) {
      console.error('Error deleting reason:', error);
      toast.error('Failed to delete reason');
    }
  };

  const handleDeleteReturnType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('return_type_options')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReturnTypes(returnTypes.filter(t => t.id !== id));
      toast.success('Return option deleted');
    } catch (error) {
      console.error('Error deleting return type:', error);
      toast.error('Failed to delete return option');
    }
  };

  // Edit return type functions
  const startEditingType = (type: ReturnTypeOption) => {
    setEditingTypeId(type.id);
    setEditTypeLabel(type.label);
    setEditTypeDescription(type.description || '');
    setEditTypeCategory(type.return_type);
  };

  const cancelEditingType = () => {
    setEditingTypeId(null);
    setEditTypeLabel('');
    setEditTypeDescription('');
    setEditTypeCategory('refund');
  };

  const handleSaveEditType = async () => {
    if (!editingTypeId || !editTypeLabel.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('return_type_options')
        .update({
          label: editTypeLabel.trim(),
          description: editTypeDescription.trim() || null,
          return_type: editTypeCategory,
        })
        .eq('id', editingTypeId);

      if (error) throw error;

      setReturnTypes(returnTypes.map(t => 
        t.id === editingTypeId 
          ? { ...t, label: editTypeLabel.trim(), description: editTypeDescription.trim() || null, return_type: editTypeCategory }
          : t
      ));
      cancelEditingType();
      toast.success('Return option updated');
    } catch (error) {
      console.error('Error updating return type:', error);
      toast.error('Failed to update return option');
    } finally {
      setSaving(false);
    }
  };

  // Edit reason functions
  const startEditingReason = (reason: ReturnReason) => {
    setEditingReasonId(reason.id);
    setEditReasonText(reason.reason);
  };

  const cancelEditingReason = () => {
    setEditingReasonId(null);
    setEditReasonText('');
  };

  const handleSaveEditReason = async () => {
    if (!editingReasonId || !editReasonText.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('return_reasons')
        .update({ reason: editReasonText.trim() })
        .eq('id', editingReasonId);

      if (error) throw error;

      setReasons(reasons.map(r => 
        r.id === editingReasonId 
          ? { ...r, reason: editReasonText.trim() }
          : r
      ));
      cancelEditingReason();
      toast.success('Return reason updated');
    } catch (error) {
      console.error('Error updating reason:', error);
      toast.error('Failed to update reason');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Return Types */}
      <Card className="border shadow-soft">
        <CardHeader>
          <CardTitle>Return Options</CardTitle>
          <CardDescription>Choose which return options customers can select</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new return type */}
          <div className="space-y-2 p-4 rounded-lg border border-dashed">
            <div className="flex gap-2">
              <Input
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                placeholder="Option label (e.g., Full Refund)"
                className="flex-1"
              />
              <Select value={newTypeCategory} onValueChange={setNewTypeCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1"
              />
              <Button onClick={handleAddReturnType} disabled={saving || !newTypeLabel.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Return types list */}
          <div className="space-y-2">
            {returnTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 group"
              >
                {editingTypeId === type.id ? (
                  // Edit mode
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={editTypeLabel}
                        onChange={(e) => setEditTypeLabel(e.target.value)}
                        placeholder="Option label"
                        className="flex-1"
                      />
                      <Select value={editTypeCategory} onValueChange={setEditTypeCategory}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="exchange">Exchange</SelectItem>
                          <SelectItem value="store_credit">Store Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={editTypeDescription}
                        onChange={(e) => setEditTypeDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
                        onClick={handleSaveEditType} 
                        disabled={saving || !editTypeLabel.trim()}
                        className="h-10 w-10"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={cancelEditingType}
                        className="h-10 w-10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <div className={`flex-1 space-y-0.5 ${!type.is_active ? 'opacity-50' : ''}`}>
                      <Label className="font-medium">{type.label}</Label>
                      {type.description && (
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      )}
                      <span className="text-xs text-muted-foreground capitalize">({type.return_type.replace('_', ' ')})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => startEditingType(type)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Switch
                      checked={type.is_active}
                      onCheckedChange={(checked) => handleToggleReturnType(type.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => handleDeleteReturnType(type.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {returnTypes.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No return options configured. Add your first one above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Return Reasons */}
      <Card className="border shadow-soft">
        <CardHeader>
          <CardTitle>Return Reasons</CardTitle>
          <CardDescription>Customize the reasons customers can select when submitting a return</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new reason */}
          <div className="flex gap-2">
            <Input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Add a new return reason..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
            />
            <Button onClick={handleAddReason} disabled={saving || !newReason.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Reasons list */}
          <div className="space-y-2">
            {reasons.map((reason) => (
              <div
                key={reason.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
              >
                {editingReasonId === reason.id ? (
                  // Edit mode
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editReasonText}
                      onChange={(e) => setEditReasonText(e.target.value)}
                      placeholder="Return reason"
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditReason()}
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSaveEditReason} 
                      disabled={saving || !editReasonText.trim()}
                      className="h-10 w-10"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={cancelEditingReason}
                      className="h-10 w-10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  // View mode
                  <>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <span className={`flex-1 ${!reason.is_active ? 'text-muted-foreground line-through' : ''}`}>
                      {reason.reason}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => startEditingReason(reason)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Switch
                      checked={reason.is_active}
                      onCheckedChange={(checked) => handleToggleReason(reason.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => handleDeleteReason(reason.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {reasons.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No return reasons configured. Add your first one above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
