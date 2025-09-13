import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Download } from 'lucide-react';
import Navbar from '@/components/Navbar';
import NewReferralDialog from '@/components/NewReferralDialog';
import ReferralDetailDialog from '@/components/ReferralDetailDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  candidate_first_name: string;
  candidate_middle_name?: string;
  candidate_last_name: string;
  candidate_phone: string;
  candidate_email: string;
  current_status: string;
  created_at: string;
  updated_at: string;
  resume_path?: string;
  how_know_candidate: string;
  jobs: {
    job_id: string;
    title: string;
    department: string;
  };
}

const EmployeeDashboard = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReferral, setShowNewReferral] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchReferrals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          jobs (
            job_id,
            title,
            department
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: "Error",
        description: "Failed to load your referrals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();

    // Set up real-time subscription
    const channel = supabase
      .channel('referrals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user?.id}`,
        },
        () => {
          fetchReferrals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800 border-blue-200',
      screening: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      interview: 'bg-purple-100 text-purple-800 border-purple-200',
      offer: 'bg-green-100 text-green-800 border-green-200',
      hired: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Referrals</h1>
            <p className="text-muted-foreground">
              Track your referrals and their progress through the hiring process
            </p>
          </div>
          <Button onClick={() => setShowNewReferral(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Referral
          </Button>
        </div>

        <div className="grid gap-6">
          {referrals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">📋</div>
                  <div>
                    <h3 className="text-lg font-semibold">No referrals yet</h3>
                    <p className="text-muted-foreground">
                      Submit your first referral to get started
                    </p>
                  </div>
                  <Button onClick={() => setShowNewReferral(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Submit First Referral
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            referrals.map((referral) => (
              <Card key={referral.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {referral.candidate_first_name}{' '}
                        {referral.candidate_middle_name && `${referral.candidate_middle_name} `}
                        {referral.candidate_last_name}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {referral.jobs.job_id} - {referral.jobs.title}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(referral.current_status)}>
                      {referral.current_status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Submitted: {formatDate(referral.created_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last Updated: {formatDate(referral.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReferral(referral)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <NewReferralDialog
        open={showNewReferral}
        onOpenChange={setShowNewReferral}
        onSuccess={fetchReferrals}
      />

      {selectedReferral && (
        <ReferralDetailDialog
          referral={selectedReferral}
          open={!!selectedReferral}
          onOpenChange={() => setSelectedReferral(null)}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;