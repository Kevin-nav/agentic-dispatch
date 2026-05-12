export function buildT3SessionUrl(input: {
  hostedAppBaseUrl: string;
  environmentId: string;
  threadId: string;
}): string {
  const base = input.hostedAppBaseUrl.endsWith("/")
    ? input.hostedAppBaseUrl
    : `${input.hostedAppBaseUrl}/`;
  const url = new URL(
    `${encodeURIComponent(input.environmentId)}/${encodeURIComponent(input.threadId)}`,
    base,
  );
  return url.toString();
}
