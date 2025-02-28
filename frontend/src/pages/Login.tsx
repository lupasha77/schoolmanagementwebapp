// src/pages/Login.tsx
import React, { useState } from 'react';
import { Container, Title, TextInput, PasswordInput, Button, Text, Alert, Stack } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuthHook';
import { IconAlertCircle } from '@tabler/icons-react';
import  api  from '../utils/api/axios';
 

interface LoginFormData {
  email: string;
  password: string;
}
interface LocationState {
  from: {
    pathname: string;
  };
}
const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResendVerification = async () => {
    try {
      setIsResendingVerification(true);
      const response = await api.post('/auth/send-verification', { email: formData.email });


      if (response.status === 200) {
        setError('Verification email has been resent. Please check your inbox.');
      } else {
        const data = await response.data; // Assuming JSON response
        setError(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      setError('Failed to resend verification email');
      console.error('Failed to resend verification email:', error); // Log the error
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
  
    try {
      const loginResponse = await login(formData);
  
      //Console.log("[Login] Full Login Response:", loginResponse);
  
      if (loginResponse?.success) {
        const from = (location.state as LocationState)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(loginResponse?.error || "Login failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed. Please try again.";
      console.error("[Login] Failed:", errorMessage);
      setError(errorMessage);
    }
  };
  
  
  
  return (
    <Container size="sm">
      <Stack gap="lg" mt={50}>
        <Title ta="center">Login</Title>

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} color="red" variant="filled">
            {error}
            {error.includes('verify') && (
              <Button
                variant="white"
                size="xs"
                ml="md"
                onClick={handleResendVerification}
                loading={isResendingVerification}
              >
                Resend Verification Email
              </Button>
            )}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            mt={20}
          />
          <PasswordInput
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            mt={20}
          />
          <Button fullWidth mt={30} type="submit">
            Login
          </Button>
        </form>

        <Text ta="center">
          Don't have an account?{' '}
          <Button variant="link" onClick={() => navigate('/register')}>
            Register here
          </Button>
        </Text>
      </Stack>
    </Container>
  );
};

export default Login;