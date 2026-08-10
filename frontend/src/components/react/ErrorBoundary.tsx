import * as React from "react";

type Props = {
  children: React.ReactNode;
  /** Rendered in place of the subtree when it throws. Defaults to nothing. */
  fallback?: React.ReactNode;
  /** Identifies the subtree in the console when something does throw. */
  label?: string;
};

type State = { hasError: boolean };

/**
 * Keeps a render-time throw contained to one panel.
 *
 * Without it, a single bad value anywhere under `<Map>` unmounts the entire
 * island and leaves a blank rectangle where the map was — which is exactly how
 * a region with no active stations took the map down. The data layer now
 * rejects unusable payloads, so this is the backstop for whatever the next
 * unexpected shape turns out to be: the map keeps panning and zooming while the
 * broken panel drops out.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(
      `[respira] ${this.props.label ?? "component"} failed to render`,
      error,
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
