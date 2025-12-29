import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ShippingFeeSettings {
  id: string;
  return_shipping_fee: number;
  new_product_shipping_fee: number;
  currency: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

export default function ShippingFeeSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ShippingFeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [returnFee, setReturnFee] = useState('0');
  const [newProductFee, setNewProductFee] = useState('0');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_fee_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setReturnFee(data.return_shipping_fee.toString());
        setNewProductFee(data.new_product_shipping_fee.toString());
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching shipping fee settings:', error);
      toast.error('Failed to load shipping fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const feeData = {
        user_id: user.id,
        return_shipping_fee: parseFloat(returnFee) || 0,
        new_product_shipping_fee: parseFloat(newProductFee) || 0,
        currency,
      };

      if (settings) {
        // Update existing
        const { error } = await supabase
          .from('shipping_fee_settings')
          .update(feeData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('shipping_fee_settings')
          .insert(feeData)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      toast.success('Shipping fee settings saved');
    } catch (error) {
      console.error('Error saving shipping fee settings:', error);
      toast.error('Failed to save settings');
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

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  return (
    <Card className="border shadow-soft">
      <CardHeader>
        <CardTitle>Shipping Fees</CardTitle>
        <CardDescription>
          Configure the shipping fees for exchanges. These fees will be displayed to customers during the return process.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.symbol} - {curr.name} ({curr.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-fee">Return Shipping Fee</Label>
          <p className="text-xs text-muted-foreground">
            The fee charged to customers for shipping the product back to you
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              id="return-fee"
              type="number"
              min="0"
              step="0.01"
              value={returnFee}
              onChange={(e) => setReturnFee(e.target.value)}
              className="pl-8"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-product-fee">New Product Shipping Fee</Label>
          <p className="text-xs text-muted-foreground">
            The fee charged to customers for shipping the replacement product to them
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              id="new-product-fee"
              type="number"
              min="0"
              step="0.01"
              value={newProductFee}
              onChange={(e) => setNewProductFee(e.target.value)}
              className="pl-8"
              placeholder="0.00"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
