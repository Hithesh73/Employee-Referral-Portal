import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Calendar, Phone, Mail, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface StatusHistory {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  changed_by: string;
  user_name?: string;
}

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

interface ReferralDetailDialogProps {
  referral: Referral;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReferralDetailDialog = ({ referral, open, onOpenChange }: ReferralDetailDialogProps) => {
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();

  const fetchStatusHistory = async () => {
    if (!employee) return;
    
    try {
      setLoading(true);
      // Primary: employee-scoped RPC (shows HR notes too)
      let { data: historyData, error } = await supabase
        .rpc('get_referral_status_history_for_employee', {
          p_employee_id: employee.employee_id,
          p_email: employee.email,
          p_referral_id: referral.id
        });

      // Fallback: if user is HR (or first call fails), use HR RPC
      if ((error || !historyData || historyData.length === 0) && employee.role === 'hr') {
        const hrRes = await supabase.rpc('get_referral_status_history_for_hr', {
          p_employee_id: employee.employee_id,
          p_email: employee.email,
          p_referral_id: referral.id,
        });
        if (hrRes.error) throw hrRes.error;
        historyData = hrRes.data as any[];
      }

      if (error) throw error;
      setStatusHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
      setStatusHistory([]);
      toast({
        title: 'Error',
        description: 'Failed to load status history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && referral && employee) {
      fetchStatusHistory();
    }
  }, [open, referral, employee]);

  const downloadResume = async () => {
    if (!referral.resume_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(referral.resume_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${referral.candidate_first_name}_${referral.candidate_last_name}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Resume downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
  };

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

  const formatDateOfBirth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">
                {referral.candidate_first_name}{' '}
                {referral.candidate_middle_name && `${referral.candidate_middle_name} `}
                {referral.candidate_last_name}
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                {referral.jobs.job_id} - {referral.jobs.title}
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(referral.current_status)}>
              {referral.current_status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Candidate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{referral.candidate_phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{referral.candidate_email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>DOB: Available in HR view</span>
              </div>
              {referral.resume_path && (
                <div>
                  <Button variant="outline" size="sm" onClick={downloadResume}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Resume
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Position Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div><strong>Job ID:</strong> {referral.jobs.job_id}</div>
                <div><strong>Title:</strong> {referral.jobs.title}</div>
                <div><strong>Department:</strong> {referral.jobs.department}</div>
              </div>
            </CardContent>
          </Card>

          {/* How I Know This Candidate */}
          <Card>
            <CardHeader>
              <CardTitle>Referrer's Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{referral.how_know_candidate}</p>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
              <CardDescription>
                Track the progress of this referral through the hiring process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="h-4 w-4 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {statusHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No updates yet.</p>
                  ) : (
                    statusHistory.map((history, index) => (
                      <div key={history.id} className="flex space-x-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full ${getStatusColor(history.status).split(' ')[0]} border-2 border-background`}></div>
                          {index < statusHistory.length - 1 && (
                            <div className="w-px h-8 bg-border mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-8">
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(history.status)}>
                              {history.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(history.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Updated by: {history.user_name}
                          </p>
                          {history.note && (
                            <p className="text-sm mt-2">{history.note}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Details */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Submitted:</strong> {formatDate(referral.created_at)}
                </div>
                <div>
                  <strong>Last Updated:</strong> {formatDate(referral.updated_at)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDetailDialog;