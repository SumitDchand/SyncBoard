import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LatencyBadge } from '../components/latency/LatencyBadge';
import * as SocketContextModule from '../contexts/SocketContext';

describe('LatencyBadge Real-Time Telemetry Component', () => {
  it('should render connecting status when socket is disconnected', () => {
    vi.spyOn(SocketContextModule, 'useSocket').mockReturnValue({
      socket: null,
      isConnected: false,
      onlineUsers: [],
      latencyTelemetry: null,
      joinBoard: vi.fn(),
      leaveBoard: vi.fn(),
      recordUpdateLatency: vi.fn(),
    });

    render(<LatencyBadge />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should render < 100ms target met badge when latency is low', () => {
    vi.spyOn(SocketContextModule, 'useSocket').mockReturnValue({
      socket: {} as any,
      isConnected: true,
      onlineUsers: [],
      latencyTelemetry: {
        totalRoundtripMs: 28,
        serverProcessingMs: 6,
        networkTransitMs: 22,
      },
      joinBoard: vi.fn(),
      leaveBoard: vi.fn(),
      recordUpdateLatency: vi.fn(),
    });

    render(<LatencyBadge />);
    expect(screen.getByText('28ms')).toBeInTheDocument();
    expect(screen.getByText('(<100ms Target Met)')).toBeInTheDocument();
  });

  it('should open details popover on click with breakdown metrics', () => {
    vi.spyOn(SocketContextModule, 'useSocket').mockReturnValue({
      socket: {} as any,
      isConnected: true,
      onlineUsers: [],
      latencyTelemetry: {
        totalRoundtripMs: 45,
        serverProcessingMs: 12,
        networkTransitMs: 33,
      },
      joinBoard: vi.fn(),
      leaveBoard: vi.fn(),
      recordUpdateLatency: vi.fn(),
    });

    render(<LatencyBadge />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Latency Telemetry')).toBeInTheDocument();
    expect(screen.getByText('< 100 ms')).toBeInTheDocument();
    expect(screen.getByText('45 ms')).toBeInTheDocument();
    expect(screen.getByText('12 ms')).toBeInTheDocument();
  });
});

