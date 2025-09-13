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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

interface Job {
  id: string;
  job_id: string;
  title: string;
  department: string;
}

const referralSchema = z.object({
  candidateFirstName: z.string().min(1, 'First name is required'),
  candidateMiddleName: z.string().optional(),
  candidateLastName: z.string().min(1, 'Last name is required'),
  candidatePhone: z.string().min(1, 'Phone number is required'),
  candidateEmail: z.string().email('Invalid email address'),
  candidateDob: z.string().min(1, 'Date of birth is required'),
  selectedJobs: z.array(z.string()).min(1, 'Please select at least one job'),
  howKnowCandidate: z.string().min(1, 'Please describe how you know this candidate').max(500, 'Maximum 500 characters'),
  resume: z.instanceof(File).optional(),
});

type ReferralForm = z.infer<typeof referralSchema>;

interface NewReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const NewReferralDialog = ({ open, onOpenChange, onSuccess }: NewReferralDialogProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { employee } = useAuth();
  const { toast } = useToast();

  const form = useForm<ReferralForm>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      candidateFirstName: '',
      candidateMiddleName: '',
      candidateLastName: '',
      candidatePhone: '',
      candidateEmail: '',
      candidateDob: '',
      selectedJobs: [],
      howKnowCandidate: '',
      resume: undefined,
    },
  });

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('job_id');

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load available jobs",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchJobs();
    }
  }, [open]);

  const uploadResume = async (file: File): Promise<string | null> => {
    if (!employee) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${employee.id}/${Date.now()}.${fileExt}`;
    
    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (error) throw error;
      return fileName;
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ReferralForm) => {
    if (!employee) return;

    setLoading(true);
    try {
      let resumePath: string | null = null;
      if (data.resume) {
        const uploaded = await uploadResume(data.resume);
        if (!uploaded) {
          toast({
            title: "Resume upload failed",
            description: "Continuing without attaching the resume.",
          });
        }
        resumePath = uploaded;
      }

      // Create referrals for each selected job
      for (const jobId of data.selectedJobs) {
        const { error } = await supabase
          .from('referrals')
          .insert({
            referrer_id: employee.id,
            job_id: jobId,
            candidate_first_name: data.candidateFirstName,
            candidate_middle_name: data.candidateMiddleName || null,
            candidate_last_name: data.candidateLastName,
            candidate_phone: data.candidatePhone,
            candidate_email: data.candidateEmail,
            candidate_dob: data.candidateDob,
            resume_path: resumePath,
            how_know_candidate: data.howKnowCandidate,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Referral${data.selectedJobs.length > 1 ? 's' : ''} submitted successfully!`,
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error submitting referral:', error);
      toast({
        title: "Error",
        description: error?.message || (error?.hint || 'Failed to submit referral. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedJobs = form.watch('selectedJobs');
  const howKnowText = form.watch('howKnowCandidate');

  const handleJobToggle = (jobId: string, checked: boolean) => {
    const current = selectedJobs || [];
    if (checked) {
      form.setValue('selectedJobs', [...current, jobId]);
    } else {
      form.setValue('selectedJobs', current.filter(id => id !== jobId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit New Referral</DialogTitle>
          <DialogDescription>
            Submit a candidate referral for available positions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Candidate Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Candidate Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candidateFirstName">First Name *</Label>
                <Input
                  id="candidateFirstName"
                  {...form.register('candidateFirstName')}
                />
                {form.formState.errors.candidateFirstName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.candidateFirstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateMiddleName">Middle Name</Label>
                <Input
                  id="candidateMiddleName"
                  {...form.register('candidateMiddleName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateLastName">Last Name *</Label>
                <Input
                  id="candidateLastName"
                  {...form.register('candidateLastName')}
                />
                {form.formState.errors.candidateLastName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.candidateLastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candidatePhone">Phone Number *</Label>
                <Input
                  id="candidatePhone"
                  type="tel"
                  {...form.register('candidatePhone')}
                />
                {form.formState.errors.candidatePhone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.candidatePhone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateEmail">Email *</Label>
                <Input
                  id="candidateEmail"
                  type="email"
                  {...form.register('candidateEmail')}
                />
                {form.formState.errors.candidateEmail && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.candidateEmail.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidateDob">Date of Birth *</Label>
              <Input
                id="candidateDob"
                type="date"
                {...form.register('candidateDob')}
              />
              {form.formState.errors.candidateDob && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.candidateDob.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume">Resume (PDF, DOC, DOCX - Max 10MB)</Label>
              <Input
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: "Resume must be less than 10MB",
                        variant: "destructive",
                      });
                      return;
                    }
                    form.setValue('resume', file);
                  } else {
                    form.setValue('resume', undefined as any);
                  }
                }}
              />
            </div>
          </div>

          {/* Job Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Positions *</h3>
            <p className="text-sm text-muted-foreground">
              Select one or more positions to refer this candidate for:
            </p>
            
            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border rounded-md p-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={job.id}
                    checked={selectedJobs?.includes(job.id) || false}
                    onCheckedChange={(checked) => handleJobToggle(job.id, checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={job.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {job.job_id} - {job.title}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {job.department}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {form.formState.errors.selectedJobs && (
              <p className="text-sm text-destructive">
                {form.formState.errors.selectedJobs.message}
              </p>
            )}
          </div>

          {/* How I Know This Candidate */}
          <div className="space-y-2">
            <Label htmlFor="howKnowCandidate">
              How I know this candidate * ({howKnowText?.length || 0}/500)
            </Label>
            <Textarea
              id="howKnowCandidate"
              placeholder="Please describe your relationship with the candidate and why you're referring them..."
              {...form.register('howKnowCandidate')}
              maxLength={500}
              rows={4}
            />
            {form.formState.errors.howKnowCandidate && (
              <p className="text-sm text-destructive">
                {form.formState.errors.howKnowCandidate.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : loading ? 'Submitting...' : 'Submit Referral'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewReferralDialog;