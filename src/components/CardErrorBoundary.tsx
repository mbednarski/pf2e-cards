import { Component, type ErrorInfo, type ReactNode } from "react";
import { debugError } from "../lib/debug";

interface Props {
  fallbackTitle?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class CardErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    debugError("card", "CardFace render failed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <article className="card-face card-face-error" role="alert">
          <strong>Unable to render card</strong>
          {this.props.fallbackTitle ? <p>{this.props.fallbackTitle}</p> : null}
          <p className="muted">Remove it from the batch and re-parse the source.</p>
        </article>
      );
    }

    return this.props.children;
  }
}
