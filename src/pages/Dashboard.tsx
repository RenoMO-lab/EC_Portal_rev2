import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import ReturnsTable from '@/components/dashboard/ReturnsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, RefreshCw, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnStats {
  total: number;
  pending: number;
  approved: number;
  totalValue: number;
}

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

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [stats, setStats] = useState<ReturnStats>({ total: 0, pending: 0, approved: 0, totalValue: 0 });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchReturns();
    }
  }, [user]);

  const fetchReturns = async () => {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const typedData = (data || []) as ReturnRequest[];
      setReturns(typedData);

      // Calculate stats
      const allReturns = await supabase
        .from('return_requests')
        .select('status, original_amount');

      if (allReturns.data) {
        const total = allReturns.data.length;
        const pending = allReturns.data.filter((r) => r.status === 'pending').length;
        const approved = allReturns.data.filter((r) => ['approved', 'completed'].includes(r.status)).length;
        const totalValue = allReturns.data.reduce((sum, r) => sum + (Number(r.original_amount) || 0), 0);
        setStats({ total, pending, approved, totalValue });
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoadingData(false);
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

  const handleDelete = async (id: string) => {
    try {
      // First delete related return items
      const { error: itemsError } = await supabase
        .from('return_items')
        .delete()
        .eq('return_request_id', id);

      if (itemsError) throw itemsError;

      // Then delete the return request
      const { error } = await supabase
        .from('return_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Return request deleted');
      fetchReturns();
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('Failed to delete return request');
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
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your returns and exchanges</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Returns"
            value={stats.total}
            change="+12% from last month"
            changeType="positive"
            icon={<Package className="w-5 h-5 text-primary" />}
            iconBg="bg-primary/10"
          />
          <StatsCard
            title="Pending Review"
            value={stats.pending}
            change={`${stats.pending} awaiting action`}
            changeType="neutral"
            icon={<RefreshCw className="w-5 h-5 text-warning" />}
            iconBg="bg-warning/10"
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            change="+8% approval rate"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5 text-success" />}
            iconBg="bg-success/10"
          />
          <StatsCard
            title="Total Value"
            value={`$${stats.totalValue.toLocaleString()}`}
            change="Total refund amount"
            changeType="neutral"
            icon={<DollarSign className="w-5 h-5 text-info" />}
            iconBg="bg-info/10"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card className="border shadow-soft hover:shadow-medium transition-all cursor-pointer group" onClick={() => navigate('/returns')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Manage Returns</p>
                <p className="text-sm text-muted-foreground">View and process requests</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>

          <Card className="border shadow-soft hover:shadow-medium transition-all cursor-pointer group" onClick={() => navigate('/policies')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10 group-hover:bg-success/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Return Policies</p>
                <p className="text-sm text-muted-foreground">Configure rules</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-success transition-colors" />
            </CardContent>
          </Card>

          <Card className="border shadow-soft hover:shadow-medium transition-all cursor-pointer group" onClick={() => navigate('/automation')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10 group-hover:bg-info/20 transition-colors">
                <RefreshCw className="w-6 h-6 text-info" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Automation</p>
                <p className="text-sm text-muted-foreground">Set up smart rules</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-info transition-colors" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Returns */}
        <ReturnsTable
          returns={returns}
          onApprove={handleApprove}
          onReject={handleReject}
          onView={(id) => navigate(`/returns/${id}`)}
          onDelete={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
}
