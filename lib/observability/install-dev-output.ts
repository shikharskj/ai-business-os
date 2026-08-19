import { formatDevLogChunk, flushPending } from "@/lib/observability/format-dev-output";

let pendingStdout = "";
let pendingStderr = "";
let installed = false;

function forwardEnd(
  originalEnd: NodeJS.WriteStream["end"],
  chunk?: string | Uint8Array | (() => void),
  encoding?: BufferEncoding | (() => void),
  callback?: () => void,
) {
  if (typeof chunk === "function") {
    return originalEnd(chunk);
  }
  if (chunk === undefined) {
    if (typeof encoding === "function") {
      return originalEnd(encoding);
    }
    return originalEnd(callback);
  }
  if (typeof encoding === "function") {
    return originalEnd(chunk, encoding);
  }
  if (typeof chunk === "string" && typeof encoding === "string") {
    return originalEnd(chunk, encoding, callback);
  }
  return originalEnd(chunk, callback);
}

function wrapStream(
  stream: NodeJS.WriteStream,
  getPending: () => string,
  setPending: (value: string) => void
) {
  const originalWrite = stream.write.bind(stream);
  const originalEnd = stream.end.bind(stream);

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
      if (done) {
        process.nextTick(done, null);
      }
      return true;
    }
    return originalWrite(output, enc, done);
  }) as typeof stream.write;

  stream.end = ((
    chunk?: string | Uint8Array | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ) => {
    let pending = getPending();

    // If chunk is a string, process it through the buffering flow
    if (typeof chunk === "string") {
      const { output, pending: newPending } = formatDevLogChunk(chunk, pending);
      pending = newPending;
      if (output.length > 0) {
        originalWrite(output);
      }
    }

    // Flush any remaining pending content
    if (pending.length > 0) {
      const flushed = flushPending(pending);
      setPending("");
      if (flushed.length > 0) {
        originalWrite(flushed);
      }
    } else {
      setPending("");
    }

    // Forward end call without passing raw chunk for strings
    if (typeof chunk === "string") {
      return forwardEnd(originalEnd, undefined, encoding, callback);
    }
    return forwardEnd(originalEnd, chunk, encoding, callback);
  }) as typeof stream.end;
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
