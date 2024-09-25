import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
} from '@/components/example'

import { z } from 'zod'
import { ProjectsSkeleton } from '@/components/projects/projects-skeleton'
import { Projects } from '@/components/projects/projects'
import { DonateProject } from '@/components/projects/donate'

import { PotsSkeleton } from '@/components/pots/pots-skeleton'
import { Pots } from '@/components/pots/pots'
import { DonatePot } from '@/components/pots/donate'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/example/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'
//https://sdk.vercel.ai/docs/guides/rag-chatbot#create-api-route
async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${amount * price
            }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'),
    initial: <SpinnerMessage />,
    system: `
    You are helpful assistant that specializes in https://app.potlock.org/.
Potlock is the portal for public goods, non-profits, and communities to raise funds transparently on the Near blockchain.
Given a name or description, find project details or create donation transactions through your available tools. 
In addition to fetching project metadata, you can also look up pot metadata.  Donations can be made to a project directly, or to a project within a pot if specified. 
Whenever making a donate transaction only use the first transaction in the array (which will be the closest match) returned from the API.
`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      searchProject: {
        description:
          'Search engine for potlock project. input should be a search query. Always say and no more explain : "Here is some information . If you have any questions please let me know ',
        parameters: z.object({
          query: z.string().describe('Keywords search for project information'),
          k: z.number().describe('Number of projects to search for')
        }),
        generate: async function* ({ query, k }) {
          yield (
            <BotCard>
              <ProjectsSkeleton />
            </BotCard>
          )
          const response = await fetch(`https://potlock-search-similarity-api.vercel.app/api/projects?q=${query}&k=${k + ""}`);
          const data = await response.json();


          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'searchProject',
                    toolCallId,
                    args: { query }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'searchProject',
                    toolCallId,
                    result: { data }
                  }
                ]
              }
            ]
          })
          return (
            <BotCard>
              <BotCard>
                <Projects props={{ data }} />
              </BotCard>
            </BotCard>
          )
        }
      },
      searchPot: {
        description:
          'Search engine for potlock pot. input should be a search query. Always say and no more explain : "Here is some information . If you have any questions please let me know ',
        parameters: z.object({
          query: z.string().describe('Keywords search for project information'),
          k: z.number().describe('Number of projects to search for')
        }),
        generate: async function* ({ query, k }) {
          yield (
            <BotCard>
              <PotsSkeleton />
            </BotCard>
          )
          const response = await fetch(`https://potlock-search-similarity-api.vercel.app/api/pots?q=${query}&k=${k + ""}`);
          const data = await response.json();


          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'searchPot',
                    toolCallId,
                    args: { query }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'searchPot',
                    toolCallId,
                    result: { data }
                  }
                ]
              }
            ]
          })
          return (
            <BotCard>
              <BotCard>
                <Pots props={{ data }} />
              </BotCard>
            </BotCard>
          )
        }
      },
      createDonationProjectTransaction: {
        description:
          'Create donation transactions for project`s potlock',
        parameters: z.object({
          query: z.string().describe('Keywords search for project information'),
          amount: z.number().describe('amount to donate')
        }),
        generate: async function* ({ query, amount }) {
          yield (
            <BotCard>
              <ProjectsSkeleton />
            </BotCard>
          )
          console.log("hello")
          const response = await fetch(`https://potlock-search-similarity-api.vercel.app/api/projects?q=${query}`);
          let project = await response.json();
          project = project[0];
          const toolCallId = nanoid()
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'createDonationProjectTransaction',
                    toolCallId,
                    args: { query, amount }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'createDonationProjectTransaction',
                    toolCallId,
                    result: { project }
                  }
                ]
              }
            ]
          })
          return (
            <BotCard>
              <BotCard>
                <DonateProject props={{ project, amount }} />
              </BotCard>
            </BotCard>
          )
        }
      },
      createDonationPotTransaction: {
        description:
          'Create donation transactions for pot"s potlock',
        parameters: z.object({
          potName: z.string().describe('Keywords search for pot information'),
          projectName: z.string().describe('Keywords search for project information'),
          amount: z.number().describe('amount to donate')
        }),
        generate: async function* ({ potName, projectName, amount }) {
          yield (
            <BotCard>
              <PotsSkeleton />
            </BotCard>
          )
          const res = await fetch(`https://potlock-search-similarity-api.vercel.app/api/projects?q=${projectName}`);
          const projectData = await res.json();
          
          const project = projectData[0]
          const resPot = await fetch(`https://potlock-search-similarity-api.vercel.app/api/pots?q=${potName}`);
          const potData = await resPot.json();
          const pot = potData[0]
          const toolCallId = nanoid()
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'createDonationPotTransaction',
                    toolCallId,
                    args: { potName, projectName, amount }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'createDonationPotTransaction',
                    toolCallId,
                    result: { project, pot }
                  }
                ]
              }
            ]
          })
          return (
            <BotCard>
              <BotCard>
                <DonatePot props={{ pot, project, amount }} />
              </BotCard>
            </BotCard>
          )
        }
      },
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'searchProject' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                <Projects props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'searchPot' ? (
              <BotCard>
                <Pots props={tool.result} />
              </BotCard>)
              : tool.toolName === 'createDonationProjectTransaction' ? (
                <BotCard>
                  <DonateProject props={tool.result} />
                </BotCard>)
                : tool.toolName === 'createDonationPotTransaction' ? (
                  <BotCard>
                    <DonatePot props={tool.result} />
                  </BotCard>) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
