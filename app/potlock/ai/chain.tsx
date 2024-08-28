import {
    ChatPromptTemplate,
    MessagesPlaceholder,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { AgentExecutor } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { CreateTransaction } from "@/app/potlock/components/transaction";
import { createRunnableUI } from "../utils/server";
import { memory } from "./memory";
import { Project } from "../components/project";
import { tool } from "@langchain/core/tools";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import {
    RunnableSequence,
} from "@langchain/core/runnables";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser"
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { hybridSearch } from "./tools";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const potlockTool = tool(
    async (input, config) => {
        // need to api third party
        const similaritySearchResults = await hybridSearch(input.query, 'potlock', 5, 5);;
        
        const filters = [];
        for (const doc of similaritySearchResults) {
            filters.push(JSON.parse(doc.pageContent))
        }
        const stream = await createRunnableUI(config);
        stream.update(<div>Searching potlock data...</div>);
        stream.done(
            <div className="flex gap-2 flex-wrap justify-end">
                {filters.map((content, index) => (
                    content && <Project content={content} key={index}></Project>
                ))}
            </div>
        );
        if (filters.length > 0) {
            return JSON.stringify(filters);
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
        const res = await hybridSearch(input.query, 'potlock', 1, 1);
        const doc = JSON.parse(res[0].pageContent)
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
        return JSON.stringify(res) 
    },
    {
        name: "createTransaction",
        description: "A transaction tool for potlock . create transaction button",
        schema: z.object({
            query: z.string().describe("The search query used to search for potlock's project."),
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