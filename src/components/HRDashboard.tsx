import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Search, Settings, Users, Briefcase, Clock, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import HRReferralDetailDialog from '@/components/HRReferralDetailDialog';
import JobManagementDialog from '@/components/JobManagementDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface Job {
  id: string;
  job_id: string;
  title: string;
  department: string;
  is_active: boolean;
}

interface StatusCounts {
  [key: string]: number;
}

const HRDashboard = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showJobManagement, setShowJobManagement] = useState(false);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  
  const { toast } = useToast();

  const fetchReferrals = async () => {
    try {
      const storedEmployee = localStorage.getItem('employee');
      if (!storedEmployee) {
        console.log('No employee data found');
        return;
      }

      const employee = JSON.parse(storedEmployee);
      console.log('HR Employee:', employee);

      const { data, error } = await supabase.rpc('get_referrals_for_hr_by_identifier', {
        p_employee_id: employee.employee_id,
        p_email: employee.email
      });

      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        candidate_first_name: item.candidate_first_name,
        candidate_middle_name: item.candidate_middle_name,
        candidate_last_name: item.candidate_last_name,
        candidate_phone: item.candidate_phone,
        candidate_email: item.candidate_email,
        candidate_dob: item.candidate_dob,
        current_status: item.current_status,
        created_at: item.created_at,
        updated_at: item.updated_at,
        resume_path: item.resume_path,
        how_know_candidate: item.how_know_candidate,
        jobs: {
          id: item.job_uuid,
          job_id: item.job_job_id,
          title: item.job_title,
          department: item.job_department
        },
        employees: {
          name: item.referrer_name,
          employee_id: item.referrer_employee_id
        }
      }));

      console.log('Transformed referrals:', transformedData);
      setReferrals(transformedData);
      
      // Calculate status counts
      const counts = transformedData.reduce((acc, referral) => {
        acc[referral.current_status] = (acc[referral.current_status] || 0) + 1;
        return acc;
      }, {} as StatusCounts);
      setStatusCounts(counts);
      
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: "Error",
        description: "Failed to load referrals",
        variant: "destructive",
      });
    }
  };

  const fetchJobs = async () => {
    try {
      const storedEmployee = localStorage.getItem('employee');
      if (!storedEmployee) return;

      const employee = JSON.parse(storedEmployee);

      const { data, error } = await supabase.rpc('get_all_jobs_for_hr', {
        p_employee_id: employee.employee_id,
        p_email: employee.email
      });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchReferrals(), fetchJobs()]);
      setLoading(false);
    };
    
    fetchData();

    // Set up real-time subscription
    const channel = supabase
      .channel('hr-referrals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
        },
        () => {
          fetchReferrals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let filtered = referrals;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((referral) =>
        `${referral.candidate_first_name} ${referral.candidate_last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        referral.jobs.job_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.jobs.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.employees.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((referral) => referral.current_status === statusFilter);
    }

    // Apply job filter
    if (jobFilter !== 'all') {
      filtered = filtered.filter((referral) => referral.jobs.id === jobFilter);
    }

    setFilteredReferrals(filtered);
  }, [referrals, searchTerm, statusFilter, jobFilter]);

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

  const StatusCard = ({ title, count, icon: Icon, color }: {
    title: string;
    count: number;
    icon: any;
    color: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-1/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <h1 className="text-3xl font-bold">HR Dashboard</h1>
            <p className="text-muted-foreground">
              Manage referrals and track hiring progress
            </p>
          </div>
          <Button onClick={() => setShowJobManagement(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Jobs
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatusCard
            title="Total Referrals"
            count={referrals.length}
            icon={Users}
            color="text-blue-600"
          />
          <StatusCard
            title="Active Jobs"
            count={jobs.filter(j => j.is_active).length}
            icon={Briefcase}
            color="text-green-600"
          />
          <StatusCard
            title="In Progress"
            count={(statusCounts.screening || 0) + (statusCounts.interview || 0) + (statusCounts.offer || 0)}
            icon={Clock}
            color="text-orange-600"
          />
          <StatusCard
            title="Hired"
            count={statusCounts.hired || 0}
            icon={CheckCircle}
            color="text-emerald-600"
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filter Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates, jobs, or referrers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_id} - {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <div className="space-y-4">
          {filteredReferrals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">📋</div>
                  <div>
                    <h3 className="text-lg font-semibold">No referrals found</h3>
                    <p className="text-muted-foreground">
                      {referrals.length === 0 
                        ? "No referrals have been submitted yet"
                        : "Try adjusting your filters to see more results"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredReferrals.map((referral) => (
              <Card key={referral.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">
                          {referral.candidate_first_name}{' '}
                          {referral.candidate_middle_name && `${referral.candidate_middle_name} `}
                          {referral.candidate_last_name}
                        </CardTitle>
                        <Badge className={getStatusColor(referral.current_status)}>
                          {referral.current_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {referral.jobs.job_id} - {referral.jobs.title}
                      </CardDescription>
                      <p className="text-sm text-muted-foreground mt-1">
                        Referred by: {referral.employees.name} ({referral.employees.employee_id})
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReferral(referral)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Submitted: {formatDate(referral.created_at)}</span>
                    <span>Last Updated: {formatDate(referral.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {selectedReferral && (
        <HRReferralDetailDialog
          referral={selectedReferral}
          open={!!selectedReferral}
          onOpenChange={() => setSelectedReferral(null)}
          onUpdate={fetchReferrals}
        />
      )}

      <JobManagementDialog
        open={showJobManagement}
        onOpenChange={setShowJobManagement}
        onUpdate={fetchJobs}
      />
    </div>
  );
};

export default HRDashboard;