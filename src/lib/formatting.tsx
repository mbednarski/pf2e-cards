import { Fragment, type ReactNode } from "react";

const MECHANICAL_PATTERN =
  /(\bDC\s?\d+\b|\b\d+d\d+(?:\s?[+-]\s?\d+)?\b|\b(?:\+|-)\d+\b|\b\d+\s?(?:HP|feet|foot|ft\.?|miles?|minutes?|hours?)\b)/gi;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightMechanicalText(text: string, boldTokens: string[] = []): ReactNode[] {
  const tokenPattern =
    boldTokens.length > 0
      ? new RegExp(
          `${MECHANICAL_PATTERN.source}|(${boldTokens.map((token) => escapeRegExp(token)).join("|")})`,
          "gi",
        )
      : MECHANICAL_PATTERN;

  return text.split(/\n/).flatMap((line, lineIndex, lines) => {
    const parts = line.split(tokenPattern);
    const rendered = parts
      .filter((segment) => segment !== "")
      .map((segment, segmentIndex) => {
        const shouldBold = tokenPattern.test(segment);
        tokenPattern.lastIndex = 0;
        return shouldBold ? (
          <strong key={`${lineIndex}-${segmentIndex}`}>{segment}</strong>
        ) : (
          <Fragment key={`${lineIndex}-${segmentIndex}`}>{segment}</Fragment>
        );
      });

    if (lineIndex < lines.length - 1) {
      rendered.push(<br key={`break-${lineIndex}`} />);
    }

    return rendered;
  });
}
