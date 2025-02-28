import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  timestamps: number[];
  remaining: number;
  resetTime: number | null;
}

interface RateLimitInfo {
  canProceed: boolean;
  waitTimeMs: number;
  remaining: number;
}

export const useRateLimit = (config: RateLimitConfig) => {
  const [state, setState] = useState<RateLimitState>({
    timestamps: [],
    remaining: config.maxRequests,
    resetTime: null
  });

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Clean up old timestamps and calculate remaining requests
    const validTimestamps = state.timestamps.filter(time => time > windowStart);
    const remaining = config.maxRequests - validTimestamps.length;
    
    if (remaining <= 0) {
      const oldestTimestamp = Math.min(...validTimestamps);
      const resetTime = oldestTimestamp + config.windowMs;
      setState({
        timestamps: validTimestamps,
        remaining: 0,
        resetTime
      });
      return false;
    }

    setState({
      timestamps: [...validTimestamps, now],
      remaining: remaining - 1,
      resetTime: null
    });
    return true;
  }, [config.maxRequests, config.windowMs, state.timestamps]);

  const getRateLimitInfo = useCallback((): RateLimitInfo => {
    const now = Date.now();
    if (state.resetTime) {
      const waitTimeMs = state.resetTime - now;
      return {
        canProceed: false,
        waitTimeMs: Math.max(0, waitTimeMs),
        remaining: state.remaining
      };
    }
    return {
      canProceed: true,
      waitTimeMs: 0,
      remaining: state.remaining
    };
  }, [state.resetTime, state.remaining]);

  return {
    checkRateLimit,
    getRateLimitInfo
  };
};