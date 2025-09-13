import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const emailLoginSchema = loginSchema.extend({
  email: z.string().email('Invalid email address'),
});

const employeeLoginSchema = loginSchema.extend({
  employeeId: z.string().min(1, 'Employee ID is required'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['employee', 'hr'], { required_error: 'Please select a role' }),
});

type EmailLoginForm = z.infer<typeof emailLoginSchema>;
type EmployeeLoginForm = z.infer<typeof employeeLoginSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { signInWithEmail, signInWithEmployeeId, signUp } = useAuth();
  const navigate = useNavigate();

  const emailForm = useForm<EmailLoginForm>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const employeeForm = useForm<EmployeeLoginForm>({
    resolver: zodResolver(employeeLoginSchema),
    defaultValues: { employeeId: '', password: '' },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      employeeId: '',
      firstName: '',
      lastName: '',
      role: 'employee',
    },
  });

  const onEmailLogin = async (data: EmailLoginForm) => {
    setIsLoading(true);
    const { error } = await signInWithEmail(data.email, data.password);
    if (!error) {
      navigate('/');
    }
    setIsLoading(false);
  };

  const onEmployeeLogin = async (data: EmployeeLoginForm) => {
    setIsLoading(true);
    const { error } = await signInWithEmployeeId(data.employeeId, data.password);
    if (!error) {
      navigate('/');
    }
    setIsLoading(false);
  };

  const onSignUp = async (data: SignUpForm) => {
    setIsLoading(true);
    const { error } = await signUp({
      email: data.email,
      password: data.password,
      employeeId: data.employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    });
    if (!error) {
      setAuthMode('login');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Employee Referral Portal</CardTitle>
          <CardDescription>
            {authMode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex rounded-lg bg-muted p-1">
              <Button
                variant={authMode === 'login' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </Button>
              <Button
                variant={authMode === 'signup' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </Button>
            </div>

            {authMode === 'login' ? (
              <Tabs defaultValue="email" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="employee">Employee ID</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <form onSubmit={emailForm.handleSubmit(onEmailLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@company.com"
                        {...emailForm.register('email')}
                      />
                      {emailForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {emailForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-password">Password</Label>
                      <Input
                        id="email-password"
                        type="password"
                        {...emailForm.register('password')}
                      />
                      {emailForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {emailForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In with Email
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="employee" className="space-y-4">
                  <form onSubmit={employeeForm.handleSubmit(onEmployeeLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input
                        id="employeeId"
                        placeholder="EMP001"
                        {...employeeForm.register('employeeId')}
                      />
                      {employeeForm.formState.errors.employeeId && (
                        <p className="text-sm text-destructive">
                          {employeeForm.formState.errors.employeeId.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee-password">Password</Label>
                      <Input
                        id="employee-password"
                        type="password"
                        {...employeeForm.register('password')}
                      />
                      {employeeForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {employeeForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In with Employee ID
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...signUpForm.register('firstName')}
                    />
                    {signUpForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {signUpForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...signUpForm.register('lastName')}
                    />
                    {signUpForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {signUpForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@company.com"
                    {...signUpForm.register('email')}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-employeeId">Employee ID</Label>
                  <Input
                    id="signup-employeeId"
                    placeholder="EMP001"
                    {...signUpForm.register('employeeId')}
                  />
                  {signUpForm.formState.errors.employeeId && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.employeeId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    onValueChange={(value: 'employee' | 'hr') => 
                      signUpForm.setValue('role', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                    </SelectContent>
                  </Select>
                  {signUpForm.formState.errors.role && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.role.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    {...signUpForm.register('password')}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;