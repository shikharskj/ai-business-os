import { formatDevLogChunk } from "@/lib/observability/format-dev-output";

let pendingStdout = "";
let pendingStderr = "";
let installed = false;

function wrapStream(
  stream: NodeJS.WriteStream,
  getPending: () => string,
  setPending: (value: string) => void
) {
  const originalWrite = stream.write.bind(stream);

  stream.write = ((
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) => {
    const done = typeof encoding === "function" ? encoding : callback;
    const enc = typeof encoding === "string" ? encoding : "utf8";

    if (typeof chunk !== "string") {
      return originalWrite(chunk, enc, done);
    }

    const { output, pending } = formatDevLogChunk(chunk, getPending());
    setPending(pending);
    if (output.length === 0) {
      done?.(null);
      return true;
    }
    return originalWrite(output, enc, done);
  }) as typeof stream.write;
}

export function installDevOutputFormatting() {
  if (installed || process.env.NODE_ENV !== "development") {
    return;
  }
  installed = true;
  wrapStream(
    process.stdout,
    () => pendingStdout,
    (value) => {
      pendingStdout = value;
    }
  );
  wrapStream(
    process.stderr,
    () => pendingStderr,
    (value) => {
      pendingStderr = value;
    }
  );
}
