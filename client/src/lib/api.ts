export type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};
export type Task = {
  _id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  owner: string | { _id: string; name: string; email: string };
};
export type TaskPage = {
  tasks: Task[];
  total: number;
  page: number;
  pages: number;
};
export type Stats = {
  total: number;
  completed: number;
  pending: number;
  highPriority: number;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}${path}`,
    {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    },
  );
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) {
    const detail = data.errors
      ?.map(
        (e: { field: string; message: string }) => `${e.field}: ${e.message}`,
      )
      .join("; ");
    throw new ApiError(
      response.status,
      detail || data.message || "Request failed",
    );
  }
  return data as T;
}
