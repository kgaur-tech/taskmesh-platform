import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { backendIdentityHeader } from "@/lib/backend-auth";

const backendUrl = process.env.BACKEND_API_URL;

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!backendUrl) return NextResponse.json({ error: "Backend service is not configured" }, { status: 503 });

  const { path } = await context.params;
  const target = new URL(path.map(encodeURIComponent).join("/"), `${backendUrl.replace(/\/$/, "")}/`);
  target.search = new URL(request.url).search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("x-taskmesh-identity", backendIdentityHeader({
    email: session.user.email,
    name: session.user.name,
    googleId: session.user.googleId,
  }));

  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const response = await fetch(target, { method, headers, body, cache: "no-store" });
  return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}

export const GET = proxy;
export const POST = proxy;
