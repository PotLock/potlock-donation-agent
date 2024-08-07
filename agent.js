import { OpenAI } from "langchain/llms/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";

import { } from 'dotenv/config'
import {
    RunnablePassthrough,
    RunnableSequence,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { createRetrieverTool } from "langchain/tools/retriever";
import { formatDocumentsAsString } from "langchain/util/document";
import { DynamicTool } from "@langchain/core/tools";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const model = new OpenAI({ apiKey: OPENAI_API_KEY, temperature: 0.9 });

async function getAnswer(question) {
    // STEP 1: Load the vector store
    const vectorStore = await HNSWLib.load(
        "./potlock-projects",
        new OpenAIEmbeddings({ apiKey: OPENAI_API_KEY }),
    );


    
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

    // Create a system & human prompt for the chat model
    const SYSTEM_TEMPLATE = `You are helpful assistant that specializes in https://app.potlock.org/.  Potlock is the portal for public goods, non-profits, and communities to raise funds transparently on the Near blockchain. Given a name or description, find project details or create donation transactions through your available tools.  In addition to fetching project metadata, you can also look up pot metadata.  Donations can be made to a project directly, or to a project within a pot if specified.  Whenever making a donate transaction only use the first transaction in the array (which will be the closest match) returned from the API.
    {context}\n\n`

    // STEP 3: Get the answer
    const messages = [
        SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
        HumanMessagePromptTemplate.fromTemplate("{question}"),
    ];

    /** Define your list of tools. */
    const customTool = new DynamicTool({
        name: "get_word_length",
        description: "Returns the length of a word.",
        func: async (input) => input.length.toString(),
    });

    const tools = [customTool,toolPOT];
    const modelWithFunctions = model.bind({
        functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });
    const prompt = ChatPromptTemplate.fromMessages(messages);
    const chain = RunnableSequence.from([
        {
            context: vectorStoreRetriever.pipe(formatDocumentsAsString),
            question: new RunnablePassthrough(),
        },
        prompt,
        modelWithFunctions,
        new StringOutputParser(),
    ]);

    const answer = await chain.invoke(
        question
    );
    console.log(answer)
}
getAnswer(`What is OSS pot?`)