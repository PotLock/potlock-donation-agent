import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { HNSWLib } from 'langchain/vectorstores/hnswlib'
import { Document } from "@langchain/core/documents";
import { whitelistedProjects } from './snapshot/projects.js'
import { whitelistedPots } from './snapshot/pots.js'
import { } from 'dotenv/config'
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

async function generateAndStoreEmbeddings() {

    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
    });

    const supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PRIVATE_KEY
    );

    const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: "documents",
        queryName: "match_documents",
    });


    const documentsProject = [];
    for (const projectDetail of whitelistedProjects) {
        const pageContent = JSON.stringify(projectDetail);
        if (projectDetail && projectDetail.accountId) {
            const metadata = {
                source: `https://app.potlock.org/?tab=project&projectId=${projectDetail.accountId}`,
                name: projectDetail.name,
                accountId: projectDetail.accountId,
            };
            new Document({ pageContent, metadata })
            documentsProject.push(new Document({ pageContent, metadata }));
        }
    }
    //const vectorStoreProject = await HNSWLib.fromDocuments(documentsProject, new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY }));
    //vectorStoreProject.save(`potlock-projects`);
   // vectorStore.addDocuments(documentsProject)
    const documentsPots = [];
    for (const potDetail of whitelistedPots) {
        const pageContent = JSON.stringify(potDetail);
        if (potDetail && potDetail.id) {
            const metadata = {
                source: `https://app.potlock.org/?tab=pot&potId==${potDetail.accountId}`,
                name: potDetail.name,
                accountId: potDetail.id,
            };
            new Document({ pageContent, metadata })
            documentsPots.push(new Document({ pageContent, metadata }));
        }
    }
    //const vectorStorePot = await HNSWLib.fromDocuments(documentsPots, new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY }));
    //vectorStorePot.save(`potlock-pots`);
    vectorStore.addDocuments(documentsPots)

}
generateAndStoreEmbeddings();