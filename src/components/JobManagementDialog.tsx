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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  job_id: string;
  title: string;
  department: string;
  is_active: boolean;
  created_at: string;
}

const jobSchema = z.object({
  job_id: z.string().min(1, 'Job ID is required'),
  title: z.string().min(1, 'Title is required'),
  department: z.string().min(1, 'Department is required'),
});

type JobForm = z.infer<typeof jobSchema>;

interface JobManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const JobManagementDialog = ({ open, onOpenChange, onUpdate }: JobManagementDialogProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const { toast } = useToast();

  const form = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      job_id: '',
      title: '',
      department: '',
    },
  });

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchJobs();
    }
  }, [open]);

  const onSubmit = async (data: JobForm) => {
    setSubmitting(true);
    try {
      if (editingJob) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update({
            job_id: data.job_id,
            title: data.title,
            department: data.department,
          })
          .eq('id', editingJob.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
      } else {
        // Create new job
        const { error } = await supabase
          .from('jobs')
          .insert({
            job_id: data.job_id,
            title: data.title,
            department: data.department,
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Job created successfully",
        });
      }

      form.reset();
      setEditingJob(null);
      fetchJobs();
      onUpdate();
      
    } catch (error: any) {
      console.error('Error saving job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleJobStatus = async (job: Job) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: !job.is_active })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Job ${job.is_active ? 'deactivated' : 'activated'} successfully`,
      });

      fetchJobs();
      onUpdate();
      
    } catch (error) {
      console.error('Error toggling job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    form.setValue('job_id', job.job_id);
    form.setValue('title', job.title);
    form.setValue('department', job.department);
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    form.reset();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Management</DialogTitle>
          <DialogDescription>
            Add, edit, and manage job positions available for referrals
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Add/Edit Job Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {editingJob ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingJob ? 'Edit Job' : 'Add New Job'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_id">Job ID *</Label>
                    <Input
                      id="job_id"
                      placeholder="e.g., ENG-004"
                      {...form.register('job_id')}
                    />
                    {form.formState.errors.job_id && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.job_id.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Senior Backend Engineer"
                      {...form.register('title')}
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Input
                      id="department"
                      placeholder="e.g., Engineering"
                      {...form.register('department')}
                    />
                    {form.formState.errors.department && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.department.message}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingJob ? 'Update Job' : 'Add Job'}
                    </Button>
                    {editingJob && (
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Jobs List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Existing Jobs ({jobs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold">No jobs yet</h3>
                    <p className="text-muted-foreground">Add your first job to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className={`p-4 rounded-lg border ${
                          editingJob?.id === job.id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold">{job.job_id}</h4>
                              <Badge variant={job.is_active ? 'default' : 'secondary'}>
                                {job.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{job.title}</p>
                            <p className="text-sm text-muted-foreground">{job.department}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {formatDate(job.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2">
                              <Label htmlFor={`toggle-${job.id}`} className="text-xs">
                                Active
                              </Label>
                              <Switch
                                id={`toggle-${job.id}`}
                                checked={job.is_active}
                                onCheckedChange={() => toggleJobStatus(job)}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(job)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
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

export default JobManagementDialog;