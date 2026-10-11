import "dotenv/config";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  baseUrl: getRequiredEnv("BASE_URL"),
  databaseUrl: getRequiredEnv("DATABASE_URL"),
};