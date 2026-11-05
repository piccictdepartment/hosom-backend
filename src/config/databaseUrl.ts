export function parseDatabaseUrl(value: string) {
  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.protocol !== "mysql:" || !url.hostname || !url.username || !database || database.includes("/")) {
    throw new Error("DATABASE_URL must use mysql://user:password@host:3306/database");
  }
  return {
    host: url.hostname.replace(/^\[|\]$/g, ""),
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}
