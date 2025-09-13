import { useAuth } from '@/hooks/useAuth';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import HRDashboard from '@/components/HRDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Employee Found</h2>
          <p className="text-muted-foreground">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {employee.role === 'hr' ? <HRDashboard /> : <EmployeeDashboard />}
    </div>
  );
};

export default Dashboard;