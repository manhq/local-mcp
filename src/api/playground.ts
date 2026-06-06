export function playgroundHtml(port: number): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LocalMCP Playground</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔧</text></svg>" />
    <style>
      body { margin: 0; }
      scalar-api-reference { display: block; height: 100vh; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="http://localhost:${port}/api/openapi.json"
      data-configuration='{"theme":"default","layout":"modern","defaultHttpClient":{"targetKey":"js","clientKey":"fetch"}}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
}
