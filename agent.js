import { OpenAI } from "langchain/llms/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { AgentExecutor } from "langchain/agents";
import { } from 'dotenv/config'
import {
    RunnablePassthrough,
    RunnableSequence,
} from "@langchain/core/runnables";
import { ChatOpenAI, formatToOpenAIFunction } from "@langchain/openai";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser"
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
import {
    RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { createRetrieverTool } from "langchain/tools/retriever";
import { createClient } from "@supabase/supabase-js";
import { } from 'dotenv/config'
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { MongoDBChatMessageHistory } from "@langchain/mongodb";
import { MongoClient, ObjectId } from "mongodb";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const model = new ChatOpenAI({
    temperature: 0,
    apiKey: OPENAI_API_KEY
});

const mongoClient = new MongoClient(process.env.MONGODB_ATLAS_URI || "", {
    driverInfo: { name: "langchainjs" },
});
await mongoClient.connect();
const collection = mongoClient.db("langchain").collection("memory");

// generate a new sessionId string
const sessionId = "1";

async function getAnswer() {
    // STEP 1: Load the vector store
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: OPENAI_API_KEY
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

    const vectorStoreRetriever = vectorStore.asRetriever();


    const toolPotlockSearch =  createRetrieverTool(vectorStoreRetriever, {
        name: "potlockAPI",
        description: "Searches potlock's data and returns potlock's data general information.",
    });

    // Create a system & human prompt for the chat model
    const SYSTEM_TEMPLATE = `You are helpful assistant that specializes in https://app.potlock.org/.
    Potlock is the portal for public goods, non-profits, and communities to raise funds transparently on the Near blockchain.
    Given a name or description, find project details or create donation transactions through your available tools. 
    In addition to fetching project metadata, you can also look up pot metadata.  Donations can be made to a project directly, or to a project within a pot if specified. 
    Whenever making a donate transaction only use the first transaction in the array (which will be the closest match) returned from the API.`

    // STEP 3: Get the answer
    const messages = [
        SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
        new MessagesPlaceholder("history"),
        HumanMessagePromptTemplate.fromTemplate("{input}"),
        new MessagesPlaceholder("agent_scratchpad")
    ];


    const tools = [toolPotlockSearch];
    const modelWithFunctions = model.bind({
        functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });
    const memory = new BufferMemory({
        chatHistory: new MongoDBChatMessageHistory({
            collection,
            sessionId,
        }),
        returnMessages: true,
        inputKey: "input",
        outputKey: "output",
        memoryKey: "history",
    });


    
    const prompt = ChatPromptTemplate.fromMessages(messages);
    const runnableAgent = RunnableSequence.from([
        {
            input: (i) => i.input,
            memory: () => memory.loadMemoryVariables({}),
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

    const executor = AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
    });
    const input0 = { input: "I like magicbuild project" };  

    const result0 = await executor.invoke(input0);
    await memory.saveContext(input0, {
        output: result0.output,
    });
    console.log(result0);
    
    // Save to History

   // console.log(await memory.loadMemoryVariables({}));

    const input1 = { input: "what should project I donate?" };

    const result1 = await executor.invoke(input1);
    console.log(result1);
    await memory.saveContext(input0, {
        output: result1.output,
    });

    // const answer = await chain.invoke(
    //     question
    // );
    // console.log(answer)
    await memory.chatHistory.clear();
}
getAnswer()