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
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const emailLoginSchema = loginSchema.extend({
  email: z.string().email('Invalid email address'),
});

const employeeLoginSchema = loginSchema.extend({
  employeeId: z.string().min(1, 'Employee ID is required'),
});

type EmailLoginForm = z.infer<typeof emailLoginSchema>;
type EmployeeLoginForm = z.infer<typeof employeeLoginSchema>;

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail, signInWithEmployeeId } = useAuth();
  const navigate = useNavigate();

  const emailForm = useForm<EmailLoginForm>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const employeeForm = useForm<EmployeeLoginForm>({
    resolver: zodResolver(employeeLoginSchema),
    defaultValues: { employeeId: '', password: '' },
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Employee Referral Portal</CardTitle>
          <CardDescription>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;