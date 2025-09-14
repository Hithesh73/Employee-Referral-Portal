import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Calendar, Phone, Mail, User, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  candidate_dob: string;
  current_status: string;
  created_at: string;
  updated_at: string;
  resume_path?: string;
  how_know_candidate: string;
  jobs: {
    id: string;
    job_id: string;
    title: string;
    department: string;
  };
  employees: {
    name: string;
    employee_id: string;
  };
}

const updateStatusSchema = z.object({
  status: z.enum(['submitted', 'screening', 'interview', 'offer', 'hired', 'rejected']),
  note: z.string().optional(),
});

type UpdateStatusForm = z.infer<typeof updateStatusSchema>;

interface HRReferralDetailDialogProps {
  referral: Referral;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const HRReferralDetailDialog = ({ referral, open, onOpenChange, onUpdate }: HRReferralDetailDialogProps) => {
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { employee } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateStatusForm>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: referral.current_status as any,
      note: '',
    },
  });

  const fetchStatusHistory = async () => {
    try {
      setLoading(true);
      
      // Get current employee data
      const storedEmployee = localStorage.getItem('employee');
      if (!storedEmployee) {
        throw new Error('No employee authentication found');
      }
      
      const employee = JSON.parse(storedEmployee);
      
      // Use the HR-specific RPC function for status history
      const { data: historyData, error } = await supabase.rpc('get_referral_status_history_for_hr', {
        p_employee_id: employee.employee_id,
        p_email: employee.email,
        p_referral_id: referral.id
      });

      if (error) throw error;

      // Transform the data to match our interface
      const historyWithNames = historyData?.map((history: any) => ({
        id: history.id,
        status: history.status,
        note: history.note,
        created_at: history.created_at,
        changed_by: history.changed_by,
        user_name: history.user_name || 'Unknown User'
      })) || [];

      setStatusHistory(historyWithNames);
    } catch (error) {
      console.error('Error fetching status history:', error);
      toast({
        title: "Error",
        description: "Failed to load status history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && referral) {
      fetchStatusHistory();
      form.reset({
        status: referral.current_status as any,
        note: '',
      });
    }
  }, [open, referral, form]);

  const downloadResume = async () => {
    if (!referral.resume_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(referral.resume_path);

      if (error) throw error;

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

  const onUpdateStatus = async (data: UpdateStatusForm) => {
    if (!employee) return;

    // Validate rejected status requires note
    if (data.status === 'rejected' && !data.note?.trim()) {
      toast({
        title: "Note Required",
        description: "Please provide a reason when rejecting a candidate",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      // Get current employee data from localStorage
      const storedEmployee = localStorage.getItem('employee');
      if (!storedEmployee) {
        throw new Error('No employee authentication found');
      }
      
      const employeeData = JSON.parse(storedEmployee);
      
      // Use the HR-specific RPC function to update status
      const { error } = await supabase.rpc('update_referral_status_by_hr', {
        p_employee_id: employeeData.employee_id,
        p_email: employeeData.email,
        p_referral_id: referral.id,
        p_status: data.status,
        p_note: data.note || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Referral status updated successfully",
      });

      form.setValue('note', '');
      fetchStatusHistory();
      onUpdate();
      
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
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

  const currentStatus = form.watch('status');
  const statusChanged = currentStatus !== referral.current_status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <p className="text-sm text-muted-foreground mt-1">
                Referred by: {referral.employees.name} ({referral.employees.employee_id})
              </p>
            </div>
            <Badge className={getStatusColor(referral.current_status)}>
              {referral.current_status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Candidate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <span>DOB: {formatDateOfBirth(referral.candidate_dob)}</span>
                  </div>
                  {referral.resume_path && (
                    <div>
                      <Button variant="outline" size="sm" onClick={downloadResume}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Resume
                      </Button>
                    </div>
                  )}
                </div>
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

            {/* Referrer's Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Referrer's Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{referral.how_know_candidate}</p>
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

          {/* Right Column - Actions & Timeline */}
          <div className="space-y-6">
            {/* Update Status */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>
                  Change the candidate's application status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onUpdateStatus)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={currentStatus}
                      onValueChange={(value) => form.setValue('status', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="screening">Screening</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="offer">Offer</SelectItem>
                        <SelectItem value="hired">Hired</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">
                      Note {currentStatus === 'rejected' && <span className="text-destructive">*</span>}
                    </Label>
                    <Textarea
                      id="note"
                      placeholder={
                        currentStatus === 'rejected' 
                          ? "Please provide a reason for rejection..." 
                          : "Optional note about this status change..."
                      }
                      {...form.register('note')}
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!statusChanged || updating}
                  >
                    {updating ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Status
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex space-x-4">
                        <div className="h-4 w-4 bg-muted rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="flex space-x-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(history.status).split(' ')[0]} border border-background`}></div>
                          {index < statusHistory.length - 1 && (
                            <div className="w-px h-8 bg-border mt-1"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-6">
                          <div className="flex flex-col space-y-1">
                            <Badge className={`${getStatusColor(history.status)} w-fit text-xs`}>
                              {history.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(history.created_at)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              By: {history.user_name}
                            </span>
                            {history.note && (
                              <p className="text-xs mt-1 p-2 bg-muted rounded">{history.note}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HRReferralDetailDialog;