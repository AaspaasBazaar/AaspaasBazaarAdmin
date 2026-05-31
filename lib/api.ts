import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export function badRequest(e: unknown) {
  if (e instanceof ZodError) {
    return err("INVALID_INPUT", "Validation failed", 400, { issues: e.issues });
  }
  return err("BAD_REQUEST", e instanceof Error ? e.message : "Bad request", 400);
}

export async function parseJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Body must be valid JSON");
  }
}
