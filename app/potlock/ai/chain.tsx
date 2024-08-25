import {
    ChatPromptTemplate,
    MessagesPlaceholder,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import {  z } from "zod";
import { CreateTransaction } from "@/app/potlock/components/transaction";
import { createRunnableUI } from "../utils/server";
import { memory } from "./memory";
import { Project } from "../components/project";
import { tool } from "@langchain/core/tools";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import {
    Runnable,
    RunnableLike,
    RunnableSequence,
} from "@langchain/core/runnables";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser"
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { text } from "stream/consumers";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: OPENAI_API_KEY
});

const supabaseClient = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_PRIVATE_KEY as string
);

const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient,
    tableName: "documents",
    queryName: "match_documents",
});

const potlockTool = tool(
    async (input, config) => {

        const similaritySearchResults = await vectorStore.similaritySearchWithScore(input.query, 5);

        const filters = [];
        for (const doc of similaritySearchResults) {
            console.log(doc[1])
            if (doc[1] > 0.4) {
                filters.push(JSON.parse(doc[0].pageContent))
            }
        }
        const stream = await createRunnableUI(config);
        stream.update(<div>Searching potlock data...</div>);

        stream.done(
            <div className="flex gap-2 flex-wrap justify-end">
                {filters.map((content, index) => (
                    <Project content={content} key={index}></Project>
                ))}
            </div>
        );
        if (filters.length > 0) {
            return filters;
        } else {
            return "No good search result found"
        }

    },
    {
        name: "potlockAPI",
        description: "A search engine for potlock's project. input should be a search query.",
        schema: z.object({
            query: z.string().describe("The search query used to search for potlock's project."),
        }),
    },
);

const createTransactionTool = tool(
    async (input, config) => {

        const stream = await createRunnableUI(config);
        const similaritySearchResults = await vectorStore.similaritySearchWithScore(input.query, 1);
        const doc = JSON.parse(similaritySearchResults[0][0].pageContent)
        stream.update(<div>Creating transaction</div>);
        //search vector project
        stream.done(
            <CreateTransaction transaction={
                {
                    receiverId: "donate.potlock.near",
                    action: {
                        params: {
                            methodName: "donate",
                            args: {
                                recipient_id: doc.accountId,
                                bypass_protocol_fee: false,
                                message: "Donate from mintbase wallet",
                            },
                            gas: "300000000000000",
                            deposit: input.amount
                        }
                    }
                }
            }
            text={'Donate now'}
            ></CreateTransaction>
        );
        return doc
    },
    {
        name: "create-transaction",
        description: "A transaction tool for potlock . create transaction button",
        schema: z.object({
            query: z.string().describe("The search query used to search for project."),
            amount: z.string().describe("Amount of Near to donate"),
        }),
    },
);

const SYSTEM_TEMPLATE = `You are helpful assistant that specializes in https://app.potlock.org/.
Potlock is the portal for public goods, non-profits, and communities to raise funds transparently on the Near blockchain.
Given a name or description, find project details or create donation transactions through your available tools. 
In addition to fetching project metadata, you can also look up pot metadata.  Donations can be made to a project directly, or to a project within a pot if specified. 
Whenever making a donate transaction only use the first transaction in the array (which will be the closest match) returned from the API.`
const messages = [
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    new MessagesPlaceholder("history"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
    new MessagesPlaceholder("agent_scratchpad")
];

const prompt = ChatPromptTemplate.fromMessages(messages);

const model = new ChatOpenAI({
    temperature: 0,
    apiKey: OPENAI_API_KEY
});

const tools = [potlockTool, createTransactionTool];
const modelWithFunctions = model.bind({
    functions: tools.map((tool) => convertToOpenAIFunction(tool)),
});

const runnableAgent = RunnableSequence.from([
    {
        input: (i) => i.input,
        memory: async () => {
            return (await memory()).loadMemoryVariables({})
        },
        agent_scratchpad: (i) =>
            formatToOpenAIFunctionMessages(i.steps),
    },
    {
        input: (previousOutput) => previousOutput.input,
        agent_scratchpad: (previousOutput) => previousOutput.agent_scratchpad,
        history: (previousOutput) => previousOutput.memory.history,
    },
    prompt,
    modelWithFunctions,
    new OpenAIFunctionsAgentOutputParser(),
]);

export const agentExecutor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
});