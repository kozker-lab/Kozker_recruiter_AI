"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { trackEvent } from "@/lib/telemetry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
    trackEvent("react_uncaught_error", {
      error_message: error.message,
      error_stack: error.stack,
      component_stack: errorInfo.componentStack
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-md text-red-800 font-sans">
          <h2 className="text-base font-bold mb-2">Something went wrong</h2>
          <p className="text-xs mb-4">An unexpected interface error occurred. Our engineering team has been notified.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs uppercase font-semibold cursor-pointer"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
