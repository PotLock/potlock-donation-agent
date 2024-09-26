'use client'

import { useWalletSelector } from "@/app/contexts/WalletSelectorContext"
import { utils } from "near-api-js";
import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'

export const DonateProject = ({ props: { project, amount } }: { props: any }) => {
    const { modal, accountId, selector } = useWalletSelector();
    const [isLoading, setIsLoading] = useState(false)
    const BOATLOAD_OF_GAS = utils.format.parseNearAmount("0.00000000003")!;

    const donate = async () => {
        setIsLoading(true)
        const wallet = await selector.wallet();

        await wallet.signAndSendTransaction({
            signerId: accountId!,
            receiverId: "donate.potlock.near",
            actions: [
                {
                    type: "FunctionCall",
                    params: {
                        methodName: "donate",
                        args: {
                            "recipient_id": project.accountId,
                            "bypass_protocol_fee": false,
                            "message": "Donate from Potlock Agent",
                        },
                        gas: BOATLOAD_OF_GAS,
                        deposit: utils.format.parseNearAmount(`${amount || 0.1 + ""}`)!,
                    }
                },

            ],
        }).then((nextMessages: any) => {
            setIsLoading(false)
        }).catch((err) => {
            console.log("err", err)
            setIsLoading(false)
        });

    }
    return (
        <div className="-mt-2 flex w-full flex-col gap-2 py-4">
            <div
                key={project.index}
                className="flex shrink-0 flex-col gap-1 rounded-lg bg-zinc-800 p-4"
            >
                <img className="object-fill" src={project.backgroundImage} />
                <div className="text-sm text-zinc-400">

                </div>
                <div className="text-base font-bold text-zinc-200">
                    {project.name}
                </div>
                <div className="text-zinc-500">
                    {project.description}
                </div>
            </div>
            <div className="">
                {accountId ?
                    <Button
                        disabled={isLoading}
                        onClick={donate}
                        className="w-full"
                    >  {isLoading ? <><IconSpinner className="mr-2 animate-spin" />Waiting for user response... </> : `Donate ${amount || '0.1'} near ${project.name}`}   </Button> : <Button
                        onClick={() => modal.show()}
                        className="w-full " >
                        Please Login to Donate
                    </Button>
                }
            </div>
        </div>

    )
}
