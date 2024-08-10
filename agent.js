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
import {
    RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { createRetrieverTool } from "langchain/tools/retriever";
import { formatDocumentsAsString } from "langchain/util/document";
import { DynamicTool } from "@langchain/core/tools";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { createClient } from "@supabase/supabase-js";
import { } from 'dotenv/config'
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const model = new ChatOpenAI({
    temperature: 0,
  });
  

async function getAnswer(question) {
    // STEP 1: Load the vector store
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

    const vectorStoreRetriever = vectorStore.asRetriever();
    // Pot search tool
    const vectorStorePOT = await HNSWLib.load(
        "potlock-pots",
        new OpenAIEmbeddings({ apiKey: OPENAI_API_KEY }),
    );

    const retrieverPOT = vectorStorePOT.asRetriever();

    const toolPOT = await createRetrieverTool(retrieverPOT, {
        name: "potlock_pot_mainnet",
        description: "Searches POT address and returns POT general information.",
    });

    const toolProject = await createRetrieverTool(vectorStoreRetriever, {
        name: "potlock_project_mainnet",
        description: "Searches project address and returns project general information.",
    });

    // Create a system & human prompt for the chat model
    const SYSTEM_TEMPLATE = `You are helpful assistant that specializes in https://app.potlock.org/.  Potlock is the portal for public goods, non-profits, and communities to raise funds transparently on the Near blockchain. Given a name or description, find project details or create donation transactions through your available tools.  In addition to fetching project metadata, you can also look up pot metadata.  Donations can be made to a project directly, or to a project within a pot if specified.  Whenever making a donate transaction only use the first transaction in the array (which will be the closest match) returned from the API.
\n\n`

    // STEP 3: Get the answer
    const messages = [
        SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
        HumanMessagePromptTemplate.fromTemplate("{input}"),
    ];

    /** Define your list of tools. */
    const customTool = new DynamicTool({
        name: "get_word_length",
        description: "Returns the length of a word.",
        func: async (input) => input.length.toString(),
    });

    const tools = [toolProject,toolPOT];
    const modelWithFunctions = model.bind({
        functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const runnableAgent = RunnableSequence.from([
        {
            input: (i) =>  i.input,
            agent_scratchpad: (i) =>
                formatToOpenAIFunctionMessages(i.steps),
        },
        prompt,
        modelWithFunctions,
        new OpenAIFunctionsAgentOutputParser(),
    ]);

    const executor = AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
    });

    const response = await executor.invoke({ input: "Hello" });

    console.log(response);
    // const answer = await chain.invoke(
    //     question
    // );
    // console.log(answer)
}
getAnswer(`What is magicbuild project?`)