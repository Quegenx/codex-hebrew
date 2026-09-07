// Run with Bun's --env-file flag; never print credentials or API error bodies.
const model = process.env.OPENAI_MODEL;
const key = process.env.OPENAI_API_KEY;
if (!key || !model) {
  console.error('Set OPENAI_API_KEY and OPENAI_MODEL in the workspace .env.');
  process.exit(1);
}
try {
  const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
    headers: {Authorization: `Bearer ${key}`},
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    console.error(`Model access check failed: HTTP ${response.status}. No translation requested.`);
    process.exitCode = 1;
  } else {
    const data = await response.json();
    if (data.id !== model) throw new Error('Unexpected model');
    console.log(`${model}: model retrieval succeeded. Generation and translation quality are not yet tested.`);
  }
} catch {
  console.error('Model access check could not complete. No credentials or response bodies logged.');
  process.exitCode = 1;
}
