// components/dashboard/dashboard-error-boundary.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from 'sonner';

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    toast.error(`Dashboard error: ${error}, ${errorInfo}`)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
              <CardTitle>Dashboard Error</CardTitle>
              <CardDescription>
                Something went wrong while loading the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {this.state.error && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <pre className="whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </div>
              )}
              <Button onClick={this.handleRetry} className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easier use
export function withDashboardErrorBoundary<T extends object>(
  Component: React.ComponentType<T>
) {
  const WrappedComponent = (props: T) => (
    <DashboardErrorBoundary>
      <Component {...props} />
    </DashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withDashboardErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}