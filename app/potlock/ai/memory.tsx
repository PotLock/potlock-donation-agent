
import { MongoDBChatMessageHistory } from "@langchain/mongodb";
import { MongoClient, ObjectId } from "mongodb";
import { BufferMemory } from "langchain/memory";
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/lib/auth";

export async function memory() {
    const mongoClient = new MongoClient(process.env.MONGODB_ATLAS_URI || "", {
        driverInfo: { name: "langchainjs" },
    });
    mongoClient.connect();
    const collection = mongoClient.db("langchain").collection("memory");

    const session = await getServerSession(authOptions) as any
    const sessionId = session.address;
    return new BufferMemory({
        chatHistory: new MongoDBChatMessageHistory({
            collection,
            sessionId,
        }),
        returnMessages: true,
        inputKey: "input",
        outputKey: "output",
        memoryKey: "history",
    });
}