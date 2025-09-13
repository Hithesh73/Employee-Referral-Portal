import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: 'employee' | 'hr';
  is_active: boolean;
}

interface AuthContextType {
  employee: Employee | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInWithEmployeeId: (employeeId: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if employee is stored in localStorage
    const storedEmployee = localStorage.getItem('employee');
    if (storedEmployee) {
      try {
        setEmployee(JSON.parse(storedEmployee));
      } catch (error) {
        localStorage.removeItem('employee');
      }
    }
    setLoading(false);
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase
        .rpc('validate_employee_login', {
          p_email: email,
          p_employee_id: null,
          p_password: password
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        const authError = { message: 'Invalid email or password' };
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
        return { error: authError };
      }

      const employee = data[0];

      // Create JWT token for authentication
      const token = btoa(JSON.stringify({ employee_id: employee.employee_id }));
      
      // Store employee data and set auth header
      setEmployee(employee);
      localStorage.setItem('employee', JSON.stringify(employee));
      localStorage.setItem('auth_token', token);
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signInWithEmployeeId = async (employeeId: string, password: string) => {
    try {
      const { data, error } = await supabase
        .rpc('validate_employee_login', {
          p_email: null,
          p_employee_id: employeeId,
          p_password: password
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        const authError = { message: 'Invalid employee ID or password' };
        toast({
          title: "Login Failed",
          description: "Invalid employee ID or password",
          variant: "destructive",
        });
        return { error: authError };
      }

      const employee = data[0];

      // Create JWT token for authentication
      const token = btoa(JSON.stringify({ employee_id: employee.employee_id }));
      
      // Store employee data and set auth header
      setEmployee(employee);
      localStorage.setItem('employee', JSON.stringify(employee));
      localStorage.setItem('auth_token', token);
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };


  const signOut = async () => {
    setEmployee(null);
    localStorage.removeItem('employee');
    localStorage.removeItem('auth_token');
  };

  const value = {
    employee,
    loading,
    signInWithEmail,
    signInWithEmployeeId,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};