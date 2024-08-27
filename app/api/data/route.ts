import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SupabaseHybridSearch } from "@langchain/community/retrievers/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";

export async function GET(req: NextRequest) {
    try {
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey: OPENAI_API_KEY
        });

        const queryString = req.nextUrl.searchParams.get('q') || ''
        const similarityK = req.nextUrl.searchParams.get('similarityK') || ''
        const keywordK = req.nextUrl.searchParams.get('keywordK') || ''
        const appId = req.nextUrl.searchParams.get('appId')
        if (appId == 'potlock') {
            const client = createClient(
                process.env.SUPABASE_URL_HYBRID || "",
                process.env.SUPABASE_ANON_KEY_HYBRID || ""
            );
            const retriever = new SupabaseHybridSearch(embeddings, {
                client,
                similarityK: parseInt(similarityK),
                keywordK: parseInt(keywordK),
                tableName: "documents",
                similarityQueryName: "match_documents",
                keywordQueryName: "kw_match_documents",
            });
            const results = await retriever.invoke(queryString);

            return NextResponse.json(results, { status: 200 });
        }

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
    }
}
