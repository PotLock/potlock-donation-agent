import { z } from "zod";

export async function hybridSearch(query: string, appId: string , keywordK:number ,similarityK:number) {
  type UrlParameters = Record<
    string,
    string | number | boolean | undefined | null
  >;

  function buildUrl<P extends UrlParameters>(
    path: string,
    parameters: P,
    baseUrl: string,
  ): string {
    const nonUndefinedParams: [string, string][] = Object.entries(parameters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, `${value}`]);
    const searchParams = new URLSearchParams(nonUndefinedParams);
    return `${baseUrl}/${path}?${searchParams}`;
  }

  const baseUrl = process.env.NEXTAUTH_URL as string;
  const response = await fetch(
    buildUrl(
      "api/data",
      { appId: appId, q: query , keywordK , similarityK},
      baseUrl,
    ),
  );

  const res = await response.json();

  if (res.error) {
    throw new Error(`Got error from potlockAPI: ${res.error}`);
  }
  return res;
}

