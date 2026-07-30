import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUserFacingMessage } from '../../services/errorHandler';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundaryInner extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: 'RipSnap could not load this screen.',
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: getUserFacingMessage(
        error,
        'RipSnap could not load this screen. Please try again.',
      ),
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Unhandled render error:', error);
    console.error(
      '[AppErrorBoundary] Component stack:',
      errorInfo.componentStack,
    );
  }

  private handleTryAgain = () => {
    this.setState({
      hasError: false,
      message: 'RipSnap could not load this screen.',
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.message}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={this.handleTryAgain}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFA',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#1A202C',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: '#4A5568',
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 340,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4299E1',
    borderRadius: 8,
    marginTop: 24,
    minWidth: 140,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default AppErrorBoundaryInner;
