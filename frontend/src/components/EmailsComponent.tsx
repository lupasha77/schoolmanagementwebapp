import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Title, Text, Button, Container, Loader } from '@mantine/core';
import api  from '../utils/api/axios';
import { AxiosError } from 'axios';

 
export function EmailVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const verificationAttempted = useRef(false);

  useEffect(() => {
    
  
    const verifyEmail = async () => {
      if (!token || verificationAttempted.current) return;
  
      verificationAttempted.current = true;
  
      try {
        console.log("Attempting verification with token:", token);
        const res = await api.get(`/auth/verify-email/${token}`, {
          
          headers: {
            Accept: "application/json",
          },
        });
  
        console.log("Verification response:", res);
        setMessage(res.data.message);
        setStatus("success");
      } catch (error) {
        console.error("Verification error:", error);
  
        // ✅ Fix: Ensure error is properly typed
        if (error instanceof AxiosError) {
          setMessage(error.response?.data?.error || "Verification failed");
        } else if (error instanceof Error) {
          setMessage(error.message);
        } else {
          setMessage("An unexpected error occurred.");
        }
  
        setStatus("error");
      }
    };
  
    verifyEmail();
  
   
  }, [token]);
  
  return (
    <Container size="sm">
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} mb="md">Email Verification</Title>
        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <Loader />
            <Text mt="md">Verifying your email...</Text>
          </div>
        )}
        {status !== 'loading' && (
          <>
            <Text mb="xl" color={status === 'success' ? 'green' : 'red'}>
              {message}
            </Text>
            <Button
              fullWidth
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </>
        )}
      </Paper>
    </Container>
  );
}

export default EmailVerification;