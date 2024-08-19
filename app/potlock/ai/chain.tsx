import {
    ChatPromptTemplate,
    MessagesPlaceholder,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { string, z } from "zod";
import { Place } from "@/app/potlock/components/place";
import { createRunnableUI } from "../utils/server";
import { search, images } from "./tools";
import { memory } from "./memory";
import { Images } from "../components/image";
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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


const potlockTool = tool(
    async (input, config) => {
        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey: OPENAI_API_KEY,
            verbose: true
        });

        const supabaseClient = createClient(
            process.env.SUPABASE_URL as string,
            process.env.SUPABASE_PRIVATE_KEY as string
        );

        const vectorStore = new SupabaseVectorStore(embeddings, {
            client: supabaseClient,
            tableName: "documents",
            queryName: "match_documents",
            filter: {
                "type": "potlock-project"
            },

        });
        const similaritySearchResults = await vectorStore.similaritySearchWithScore(input.query, 10);

        const filters = [];
        for (const doc of similaritySearchResults) {
            if (doc[1] > 0.4) {
                filters.push(JSON.parse(doc[0].pageContent))
            }
        }
        const stream = await createRunnableUI(config);
        stream.update(<div>Searching potlock data...</div>);

        stream.done(
            <div className="flex gap-2 flex-wrap justify-end">
                {filters.map((content, index) => (
                    <div className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700" key={index}>
                        <a href="#">
                            <img className="rounded-t-lg" src={content.backgroundImage} alt="" />
                        </a>
                        <div className="p-5">
                            <a href="#">
                                <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{content.name}</h5>
                            </a>
                            <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">{content.description}</p>
                            <a href="#" className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                Donate Now
                            </a>
                        </div>
                    </div>
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
        description: "A search engine for potlock's data. useful for when you need to answer questions about current events. input should be a search query.",
        schema: z.object({
            query: z.string().describe("The search query used to search for potlock's data general information."),
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

const tools = [potlockTool];
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